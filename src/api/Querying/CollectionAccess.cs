using System.Linq.Expressions;
using CoinPortal.Api.Data;

namespace CoinPortal.Api.Querying;

/// <summary>
/// Who may view a collection (and its coins and images), as query filters that EF translates:
/// the owner, everyone for a public collection, and the holder of the share link secret for an
/// unlisted one. Collections of a user locked by an admin are visible to nobody but the owner
/// (who cannot sign in meanwhile). The single place of this rule; admins get no exception.
/// </summary>
public static class CollectionAccess
{
    /// <param name="collection">Path from the queried entity to its collection.</param>
    /// <param name="userId">Signed-in user, or null.</param>
    /// <param name="shareToken">Share link secret from the request, or null.</param>
    public static Expression<Func<T, bool>> CanView<T>(
        Expression<Func<T, Collection>> collection, string? userId, string? shareToken) =>
        Apply(collection, c =>
            (userId != null && c.OwnerId == userId)
            || (c.Owner.LockedAtUtc == null
                && (c.Visibility == CollectionVisibility.Public
                    || (shareToken != null && c.Visibility == CollectionVisibility.Unlisted
                        && c.ShareToken == shareToken))));

    /// <summary>Visible to everyone: public and the owner not locked (profiles, explore).</summary>
    public static Expression<Func<T, bool>> IsPublic<T>(Expression<Func<T, Collection>> collection) =>
        Apply(collection, c => c.Visibility == CollectionVisibility.Public && c.Owner.LockedAtUtc == null);

    /// <summary>Opened by its share link: unlisted with this secret and the owner not locked.</summary>
    public static Expression<Func<Collection, bool>> IsShared(string token) =>
        c => c.Visibility == CollectionVisibility.Unlisted && c.ShareToken == token && c.Owner.LockedAtUtc == null;

    // rule(collection(x)) as one lambda over T
    private static Expression<Func<T, bool>> Apply<T>(
        Expression<Func<T, Collection>> collection, Expression<Func<Collection, bool>> rule)
    {
        var body = new ReplaceParameter(rule.Parameters[0], collection.Body).Visit(rule.Body);
        return Expression.Lambda<Func<T, bool>>(body, collection.Parameters);
    }

    private sealed class ReplaceParameter(ParameterExpression target, Expression replacement) : ExpressionVisitor
    {
        protected override Expression VisitParameter(ParameterExpression node) =>
            node == target ? replacement : base.VisitParameter(node);
    }
}
