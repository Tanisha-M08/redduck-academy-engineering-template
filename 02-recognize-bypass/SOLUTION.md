# Solution

## The chain as you found it

The `withdraw` instruction performs the following checks in order:

1. **Ed25519 signature verification:** It checks whether the oracle has signed the withdrawal message. This depends on the Ed25519 instruction and its data. The caller can provide instructions in the transaction, so this check alone is not enough to prove that the correct oracle authorized the withdrawal.

2. **Instructions sysvar check:** It reads the transaction instructions to confirm that signature verification happened. The caller supplies the account to the program, so the program must verify that it is the real Instructions Sysvar account.

3. **Oracle allowlist check:** It checks whether the oracle's public key is allowed. This depends on the allowlist account supplied by the caller. If the program does not verify the account's identity and authority, the caller may provide a fake allowlist.

4. **Withdrawal authorization:** It uses the results of these checks to decide whether the withdrawal can proceed. Every check must depend on trusted accounts, not just accounts supplied by the caller.

## Where the chain ended

The whole chain depended on accounts supplied by the caller, especially the allowlist account. My exploit test used a fake account to imitate the expected account and attempted to make the program accept it as trusted.

This showed that checking the contents of an account is not sufficient if the program does not also verify that the account is the correct, trusted account.

## The root

The root is the program's trusted configuration account, created and initialized through the program's authorized setup process. The caller must not be able to create an arbitrary account and have the program accept it as the real configuration.

The program should verify the configuration account using a Program Derived Address (PDA) derived from a fixed seed and the program ID, and check its owner and expected data.

The other checks must depend on this trusted configuration. The program should use it to identify the expected allowlist, verify the correct Instructions Sysvar account, and ensure that the oracle authorization is valid. This prevents a caller from replacing trusted accounts with fake ones.

## One root for every instruction

Every instruction that reads the configuration must verify that it is the correct configuration account, using the same PDA derivation and validation rules.

For example, initialization, withdrawal, and other instructions that use the configuration must verify its address, program ownership, and expected data before using it. The program must not trust a configuration account just because the caller supplied it.

Using one consistently validated root of trust ensures that every instruction relies on the same trusted configuration and prevents account substitution attacks.
