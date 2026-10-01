# Design reference: native redesign (handoff of 2026-09-30)

Version-pinned copy of the Claude Design handoff `design_handoff_moojot_app` (files dated 2026-09-30), the reference for [the iOS redesign spec](../../../.scratch/native-redesign-ios/spec.md). Every implementation ticket checks against this same set.

- Reference only. Nothing here is imported by the app. Don't copy `Moojot Home.dc.html`, `support.js` or the `*-frame.jsx` device frames into `apps/native`; rebuild with the app's own components.
- Open `Moojot Home.dc.html` in a browser to run the prototype. It loads React 18.3.1, Babel 7.29.0, `@mdi/font` 7.4.47 and Roboto from CDNs.
- `README.md` is the handoff spec: tokens, sizes, copy and motion. `screenshots/` holds the 29 reference images. `assets/` and `fonts/` hold the handoff's resized art and the one font weight it uses; the app ships its own copies under `apps/native/assets/`.
- Lint and format skip this directory (`vite.config.ts`), so the files stay byte-identical to the handoff.
- Don't edit these files. A newer handoff goes in a new dated directory, and the spec is pointed at it.

## Checksums (SHA-256)

```text
cbf1bf9e56aa62bd2bd592cb76391524b21b938e49d98ead5c70a64358fb3335  android-frame.jsx
ef904eaefe98c124e043b90c46ab8f154ac30631fc7e036621452e801f51ad1f  assets/brand-mascot.png
7a70699c5b69c46a905176e57341a1db37e278edaca3835abbcfc5e1ab083772  assets/carrot-reward.png
1ed1bceaef4f5f6993b7b81666c6c77fed681a7e278631ec009620a6dc7c0c83  assets/entry-pig.png
a84d04721ae7e58f4f518fee800aca86a34534d37ee974c5f87cd7179e7acd3d  assets/onboarding-final.png
a04d246112f1fe0db9b6b526f4c0534651310e709f95079fd170e9636419304c  assets/onboarding-privacy.png
af89f46bfe7a0af23909e241c8b65d377d101e7ab84de41c921a7876225b2271  assets/onboarding-reasons.png
7b3c957c13dd68bbd90b5e283da843b109e94460e13e61895587afffcb4e5262  assets/onboarding-slips.png
7b3bcfb1bec59332c0d3ee40e018ef9d92fab369b0a914376d746ed85a21e83a  assets/onboarding-welcome.png
0c0b77c2c4ad1c3dfcb77925c3fa40da5b1f80e87a2aebecb2db547f93212d70  assets/profile-greeting.png
74ac950f31e7fa1c7a126aebde49f8d2f7b7bc5c550e2b948868a6d6a71c2a6a  assets/search-empty-pig.png
0430b40f5dd72c92912e8a72e5520dba367f1611e68050c7493e1c054a8d6d39  assets/streak-hero.png
a016a0798c29549fbda3d7ad23da6b229d64096be0fb89637e529e1f1782c48e  assets/tutorial-feed.png
c75483c268c3b066ed7215577753e1441915758ea980f5571422697c8c8cf8af  assets/tutorial-overview.png
8b38d66099cbc2b853915ab88a5711b2082dcb159eed6708adecfc4195390cc4  assets/tutorial-return.png
9efc3da877eccc0f65ea88d03081da523bec35dad691dbaaa12ba60801ab2d88  assets/tutorial-streak.png
415a646e00cc2489540b2cab47f90e39f35820c6c580f74480a84bcac5a8ab14  fonts/LINESeedSansTH-Regular.ttf
24642b887be3d26ab5d1ff445ad98c363cffd33746c539a117da570ac7b6eb54  ios-frame.jsx
77e35034486524d093ea55d4474d122577a475e2107a24750b53d866e894807e  Moojot Home.dc.html
dab17ed01a84fa89d2321a4a153d8fe42753872dcf82690f45fe9fbdb45ab836  README.md
e4a7f9c9aaccc7354bfdfb45df8482c10d98103bdd0168be5b1357e5dfd9b205  screenshots/00a-auth-signup.png
9c950e77171b73174813ef764e42236918906af2ab02d1228e8b7c3da6882c47  screenshots/00b-auth-signin-error.png
3f28dc02187d3326bd3108de85c32705dacaedc2dd4858931001c65147b5eee7  screenshots/00c-onboarding-greeting.png
2d8742bf9f7d269d545d061ca2e34db5a9fa1b71fde5c31bde7f1cc0001bd34a  screenshots/00d-onboarding-terms.png
7bcb2f7315736c0296edc5c8abd257e98026bee9a4c8f95568e311bd8fae9d79  screenshots/00e-onboarding-slips.png
f01b0db37d9c3498af7d602659260733c35e3383c8fb4857013ab4a37e6be436  screenshots/00f-onboarding-goals.png
91c9c3eeb78a66dfea389b3af8ab1c6a1c5bd96b30b502581f47475971883203  screenshots/00g-onboarding-extras.png
dee4b38f4b773e0c15d32c8b0ae8609a3e4774de48246a039df5c790c0a8da0b  screenshots/00h-onboarding-ready.png
2eee4cd2c97773a9bac6dd9273da4bb399955f9ad017209b7baacbc657d6ed53  screenshots/01a-home.png
37b5b32b90b7ea1b7163965a378231c6ad87f4243bcbddc99fe37d41f3537ea8  screenshots/01b-home-dark.png
7b70572fb52594b9a02838a2b6e8f4ca88f93c554d76b70aef4fc0a8c3c51767  screenshots/01c-home-android.png
9a5d3e081462c75d860017f8565c0a82db829e812314e2dd7f78e741d3b092b0  screenshots/01d-home-filter-sheet.png
6c4ffa48dad051cae34c72911015cc012e8b52ab9055cf6dc35990f6a80253fd  screenshots/01e-home-category-queue.png
b0acf582fd2c27b020fd46160eb9086a706851204ac2d6751c68149a344b9077  screenshots/01f-home-reading-slips.png
d259c07bf4012b0aad8bb3343928d1d2953383aa27c275eb0f1c83cef71002ff  screenshots/02a-entry-create-keypad.png
d959948d215ef91c67f7543d36675c30e0ad0b6707263b018e2706b97b5f416f  screenshots/02b-entry-edit-slip.png
e772890b78c8281b8a4e4576b7f9d96bd834dfdc63f85e7d8d6e9250872d83b4  screenshots/03-summary.png
42d656f945a5883d9fca4c31e9edfe2b4d3f5205cb61db421fc967dd3eb2dd5f  screenshots/04-slip-import.png
375d0e39cf286ee0c5a0cefd8be7a170d8816549b4ad4ed1724ce49b54a0c274  screenshots/05-streak.png
9535a897feec1debcba77e48824ab4c9cb7d1e88971c7179a11aba904489286b  screenshots/06-streak-tutorial.png
03aa283bbe86895c42a9af4b528f0db933234fd73ac9244f6daf97477358408f  screenshots/07-plan.png
6f3b07f448e6eb8ca6c08c79959e4df36d6c7fbbfcffd431739e780b50db6a97  screenshots/08-budget-form.png
7e866bed1357b5c6815e7e74a2f35aa8c5070c4e0009802090243ad4d2874915  screenshots/09-recurring-form.png
40a9924808ee370dc635ecc5ab1edb0a39a0e1ad7d26cafed1aeeb804fb71658  screenshots/10-profile.png
a15889203ccd3e3b858955b44aacd7e67b99c0077f0f72e0aec34c2f2e9509e4  screenshots/11-search.png
f995f22a96e0671aff52b26adcf12c685ceb2194990a942c3774530a9e474f4b  screenshots/12a-categories.png
2842882487b2ad5ef526fa34bf1d1e6f7f2019448747179acf3378834d7015f2  screenshots/12b-tags.png
dd901f0377c14f920fb75ddacd442ec20cf3d9ce1c27aa6f6cb95cdb82479008  screenshots/13-calendar-settings.png
6b0ca1d801c102a172f0af73a9e59ac0e44a1393e85ff2c60f1790ce86170e82  screenshots/14-credit-cards.png
8fe7df74405f3c55f49b7249c74ea1397e65d07dea2b1bd3b4a489bec2e28cbe  support.js
```
