using System.Linq.Expressions;
using CoinPortal.Api.Data;

namespace CoinPortal.Api.Querying;

/// <summary>
/// Who may view a collection (and its coins and images), as a query filter that EF translates:
/// the owner, everyone for a public collection, and the holder of the share link secret for an
/// unlisted one. The single place of this rule.
/// </summary>
public static class CollectionAccess
{
    /// <param name="collection">Path from the queried entity to its collection.</param>
    /// <param name="userId">Signed-in user, or null.</param>
    /// <param name="shareToken">Share link secret from the request, or null.</param>
    public static Expression<Func<T, bool>> CanView<T>(
        Expression<Func<T, Collection>> collection, string? userId, string? shareToken)
    {
        Expression<Func<Collection, bool>> rule = c =>
            (userId != null && c.OwnerId == userId)
            || c.Visibility == CollectionVisibility.Public
            || (shareToken != null && c.Visibility == CollectionVisibility.Unlisted && c.ShareToken == shareToken);

        // rule(collection(x)) as one lambda over T
        var body = new ReplaceParameter(rule.Parameters[0], collection.Body).Visit(rule.Body);
        return Expression.Lambda<Func<T, bool>>(body, collection.Parameters);
    }

    private sealed class ReplaceParameter(ParameterExpression target, Expression replacement) : ExpressionVisitor
    {
        protected override Expression VisitParameter(ParameterExpression node) =>
            node == target ? replacement : base.VisitParameter(node);
    }
}
