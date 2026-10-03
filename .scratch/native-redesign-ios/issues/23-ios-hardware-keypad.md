# 23: iOS hardware keyboard support for the amount keypad

**What to build:** Connect Bluetooth/iPad hardware keyboards to the iOS amount keypad. Digits, operators, ⌫, and Enter match web behavior.

**Blocked by:** 04 — [Manual entry and transaction editing](04-manual-entry.md)

**Status:** needs-triage

**Source:** [Spec: Redesign Moojot with iOS acceptance first](../spec.md) (Keypad hardware-key requirement)

**Why blocked:** This uses ticket 04's calculator/keypad, whose web hardware input already works.

**Why deferred from 04:** iOS Expo Go does not provide React Native key events without a focused text input. A native module such as `UIKeyCommand` needs a development build. Another possible approach avoids opening the onscreen keyboard.

- [ ] Choose iOS input through native module/development build or hidden text input. Explain the effect on Expo Go testing.
- [ ] Reuse `calculatorKeyForHardware` for web-equivalent keys: digits + − \* x / % , . Backspace Delete Enter =.
- [ ] Preserve onscreen keypad behavior without automatically opening the software keyboard.
- [ ] Check iPhone/iPad with an actual hardware keyboard.
