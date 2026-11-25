# Security Specification — Country Economy Tycoon Firestore Rules

## 1. Data Invariants
1. **Owner-Only Private Data**: `/saves/{uid}`, `/players/{uid}/private/wallet`, `/players/{uid}/private/session`, `/players/{uid}/projects/{projectId}`, and `/dailyLimits/{uid}_{date}` are strictly readable and writable only by `uid == request.auth.uid`. `/saves/{uid}` validates all 14 policy sliders, `gov`, `hap`, `appr`, `pop`, `fused`, `streak`, `gx`, `activeFx` (`incomeBoostMult <= 1.75`), `sub`, and balance bounds.
2. **Username Immutability & Reservation**: `/usernames/{usernameLower}` can only be created once (`!exists`) with `uid == request.auth.uid` and `usernameLower` matching `^[a-z0-9_]{3,16}$`; it cannot be overwritten or deleted by another user.
3. **Profile Ownership & Monotonicity**: `/players/{uid}` may be read (`get`/`list`) by authenticated players for leaderboard & gifting, but only `uid == request.auth.uid` can create or update their own profile, and `username`, `usernameLower`, `createdAt` are immutable after creation, with `rank` bounded in `0..10`.
4. **Wallet Integrity & Bounds**: Wallet values are strictly bounded (`0 <= cash <= 1e13`, `0 <= gems <= 1e9`, `rev >= 1` monotonically non-decreasing) and `stk` is a bounded map (`<= 40` keys).
5. **Trade Participant Isolation & State Machine**: `/trades/{tradeId}` can only be read (`get`/`list`) if `request.auth.uid in resource.data.participants`. Creation requires `from == request.auth.uid`, `to != from`, `participants == [from, to]`, `status == 'pending'`, `refunded == false`, `createdAt == request.time`, and bounded gift amounts. Updates follow strict state transitions:
   - Recipient (`to == request.auth.uid`) can only transition `pending` -> `accepted` or `rejected` (when not expired, setting `resolvedAt == request.time`).
   - Sender (`from == request.auth.uid`) can only transition `pending` -> `cancelled` or `expired` (when `request.time >= expiresAt`, with `refunded: true`, `resolvedAt == request.time`), or set `refunded: false -> true` when `status in ['rejected', 'expired']`.
   - Terminal states (`accepted`, `cancelled`, and `rejected`/`expired` once `refunded == true`) are completely locked against any further edits.
6. **Daily Limit Enforcement**: `/dailyLimits/{limitId}` requires `limitId.matches('^' + request.auth.uid + '_[0-9]{4}-[0-9]{2}-[0-9]{2}$')`, `uid == request.auth.uid`, and `1 <= count <= 15` (incremented by `+1` on update).
7. **Notifications Privacy & Anti-Spoofing**: `/players/{uid}/notifications/{notificationId}` is readable/updatable (`read: true` only) strictly by `uid == request.auth.uid`. Creation is allowed by another signed-in user (`uid != request.auth.uid`) where `from == request.auth.uid`, `createdAt == request.time`, `read == false`, `type` is in `['dm', 'new_offer', 'accepted', 'rejected', 'cancelled', 'expired']`, and any non-DM notification includes a `tradeId` verified via `existsAfter(/databases/$(database)/documents/trades/$(tradeId))`.
8. **Projects State Machine**: `/players/{uid}/projects/{projectId}` is strictly owner-only; `uid`, `type`, `startedAt` are immutable; `paid` is `1..3` (never decreases); `progressMs` is bounded `0..2400000`; `status` cannot leave `done` or `failed`; `claimed` can only transition `false -> true` when `status in ['done', 'failed']`.
9. **Chat & DM Scoping**: `/globalChat/{messageId}` requires `uid == request.auth.uid`, `rank in 0..10`, `text.size() in 1..200`, `createdAt == request.time`, and is immutable once sent. `/dms/{pairId}/messages/{messageId}` is strictly readable and creatable only if `request.auth.uid` is one of the two distinct UIDs encoded in `pairId` (`uidA_uidB`), with `from == request.auth.uid`, `text.size() in 1..300`, and `createdAt == request.time`.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Shadow Field Injection on Profile**: Creating `/players/{uid}` with extra field `isAdmin: true`.
2. **Identity Spoofing on Trade**: Creating `/trades/{id}` with `from: "victimUid"` while signed in as `"attackerUid"`.
3. **Reading Another Player's Wallet**: `get` on `/players/victimUid/private/wallet` as `"attackerUid"`.
4. **Reading Another Player's Save**: `get` on `/saves/victimUid` as `"attackerUid"`.
5. **Reading Another Player's Notifications**: `list` on `/players/victimUid/notifications` as `"attackerUid"`.
6. **Sender Self-Accepting Trade**: Updating `/trades/{id}` (`from == attackerUid, to == victimUid`) from `pending` to `accepted` as `"attackerUid"`.
7. **Double-Refund Exploit**: Updating `/trades/{id}` where `status == 'accepted'` or `refunded == true` to set `refunded: true` again.
8. **Exceeding Daily Gift Limit**: Updating `/dailyLimits/{uid}_{date}` from `count: 15` to `count: 16`, or jumping `count` from `1` to `0`.
9. **Spoofing Chat Author**: Creating `/globalChat/{id}` with `uid: "victimUid"` or `text` > 200 chars or fake `createdAt`.
10. **Snooping Private DMs**: `list` on `/dms/alice_bob/messages` while signed in as `"charlie"`.
11. **Mutating Immutable Profile Username**: Updating `/players/{uid}` to change `username` or `createdAt`.
12. **Infinite Cash Poisoning in Wallet**: Updating `/players/{uid}/private/wallet` with `cash: -100` or `cash: 999999999999999` (`> 1e13`) or `rev` decreasing.
