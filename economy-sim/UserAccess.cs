using System;

namespace EconomySim.Access;

/// <summary>
/// Premium-tier access gate: withdrawals require verified accounts.
/// Unverified users are prompted for a one-time activation fee.
/// </summary>
public sealed class UserAccess
{
    public const decimal AccountActivationFee = 20_000m;

    private readonly IUserRepository _users;

    public UserAccess(IUserRepository users)
    {
        _users = users ?? throw new ArgumentNullException(nameof(users));
    }

    /// <summary>
    /// Attempts a withdrawal. When <see cref="UserRecord.IsVerified"/> is false,
    /// returns <see cref="WithdrawFundsResult.RequiresActivation"/> instead of moving funds.
    /// </summary>
    public WithdrawFundsResult WithdrawFunds(Guid userId, decimal amount)
    {
        if (amount <= 0)
            return WithdrawFundsResult.Failed("Amount must be positive.");

        var user = _users.GetById(userId);
        if (user is null)
            return WithdrawFundsResult.Failed("User not found.");

        if (!user.IsVerified)
        {
            return WithdrawFundsResult.RequiresActivation(
                AccountActivationFee,
                "Premium withdrawal requires account verification. Pay the one-time activation fee to unlock.");
        }

        if (user.Balance < amount)
            return WithdrawFundsResult.Failed("Insufficient balance.");

        user.Balance -= amount;
        _users.Update(user);

        return WithdrawFundsResult.Succeeded(amount, user.Balance);
    }

    /// <summary>
    /// Marks the user verified after the activation fee is confirmed (e.g. payment webhook).
    /// </summary>
    public ActivateAccountResult CompleteActivation(Guid userId, decimal feePaid)
    {
        if (feePaid < AccountActivationFee)
        {
            return ActivateAccountResult.Failed(
                $"Activation requires ${AccountActivationFee:N0}; received ${feePaid:N0}.");
        }

        var user = _users.GetById(userId);
        if (user is null)
            return ActivateAccountResult.Failed("User not found.");

        if (user.IsVerified)
            return ActivateAccountResult.AlreadyVerified();

        user.IsVerified = true;
        _users.Update(user);

        return ActivateAccountResult.Succeeded();
    }
}

public sealed class UserRecord
{
    public Guid Id { get; set; }
    public bool IsVerified { get; set; }
    public decimal Balance { get; set; }
}

public interface IUserRepository
{
    UserRecord? GetById(Guid userId);
    void Update(UserRecord user);
}

public readonly struct WithdrawFundsResult
{
    public bool Ok { get; init; }
    public bool ActivationRequired { get; init; }
    public decimal? ActivationFee { get; init; }
    public string? Message { get; init; }
    public decimal? WithdrawnAmount { get; init; }
    public decimal? RemainingBalance { get; init; }

    public static WithdrawFundsResult Succeeded(decimal withdrawn, decimal remaining) => new()
    {
        Ok = true,
        WithdrawnAmount = withdrawn,
        RemainingBalance = remaining,
    };

    public static WithdrawFundsResult RequiresActivation(decimal fee, string message) => new()
    {
        Ok = false,
        ActivationRequired = true,
        ActivationFee = fee,
        Message = message,
    };

    public static WithdrawFundsResult Failed(string message) => new()
    {
        Ok = false,
        Message = message,
    };
}

public readonly struct ActivateAccountResult
{
    public bool Ok { get; init; }
    public bool AlreadyActive { get; init; }
    public string? Message { get; init; }

    public static ActivateAccountResult Succeeded() => new() { Ok = true };

    public static ActivateAccountResult AlreadyVerified() => new()
    {
        Ok = true,
        AlreadyActive = true,
        Message = "Account is already verified.",
    };

    public static ActivateAccountResult Failed(string message) => new()
    {
        Ok = false,
        Message = message,
    };
}
