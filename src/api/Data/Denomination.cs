namespace CoinPortal.Api.Data;

/// <summary>
/// Euro coin denominations. The numeric value is the face value in cents,
/// so ordering by this column sorts from 1 cent to 2 euro.
/// </summary>
public enum Denomination
{
    Cent1 = 1,
    Cent2 = 2,
    Cent5 = 5,
    Cent10 = 10,
    Cent20 = 20,
    Cent50 = 50,
    Euro1 = 100,
    Euro2 = 200
}