'use strict';
// ---------------------------------------------------------------------------
//  AP CSA TEACHER BUNDLE: GOOGLE SLIDES FILE IDS.
//
//  GENERATED FILE, eventually. Regenerate with a CSA equivalent of
//  scripts/cyber-slide-embeds-from-csv.js once one exists.
//
//  THIS MAP IS EMPTY ON PURPOSE, AND STAYS THAT WAY UNTIL REAL CONTENT EXISTS.
//  No AP CSA slide deck has been authored or converted yet. Board task 183 and
//  docs/runs/2026-09-03-claude-code-csa-slides-pipe.md are the pipe-only pass
//  that wires the engineering path (route, manifest, entitlement, theme gate)
//  end to end for the Unit 1 pilot. This file is what proves that pipe is
//  honest rather than faked: config/csa-slide-manifest.js knows about all 15
//  Unit 1 lessons (isKnownLesson is true, so the route answers 200 instead of
//  404), and every one of them resolves zero decks, because zero decks exist.
//  An entitled caller sees "your access is active, decks are being prepared"
//  (assets/apcs-slides-gate.js's renderPending, proven correct for cyber's
//  identical wholly-unconverted-lesson state in smoke/cyber-slide-gate.js
//  section 5). Nobody, including this file's author, invented a placeholder
//  deck to make the panel look more finished than the content actually is.
//
//  Same key format as config/cyber-slide-embeds.js, the closer sibling
//  (embed-only, no track dimension): `<lessonId>|<day>|<variant>`, e.g.
//  `1-1|1|teacher`. Kept identical on purpose so a future CSA conversion
//  script can be a copy of scripts/cyber-slide-embeds-from-csv.js with the
//  output path changed, not a new format invented from scratch.
//
//  SENSITIVITY, for whoever fills this in later. A Google Slides id is a
//  credential in every sense that matters here: the converted decks would be
//  shared "anyone with the link can view", because the paying teacher is
//  gated on their APCSExamPrep teacher token and not on a Google account, so
//  Google itself cannot do the gating. Holding the id IS access. It must
//  never appear in a response to an unentitled caller, and never in page
//  HTML. routes/slides.js is the only thing that may disclose one, unchanged
//  by this file's addition.
//
//  An empty map is a valid, already-proven state: config/cyber-slide-manifest.js
//  documents the identical case ("An empty map is a valid state: it means the
//  conversion has not run yet"), and smoke/cyber-slide-gate.js's lesson 1-5
//  exercises it today with real assertions, not a hypothetical.
// ---------------------------------------------------------------------------

// Key format: `<lessonId>|<day>|<variant>`, e.g. `1-2|3|teacher`. No track
// segment, matching config/cyber-slide-embeds.js: CSA has no CB Standard /
// Deep Dive split planned.
const SLIDE_IDS = {
  '2-1|1|student': '1YDxYitFg4tf_K-3v2oU5DaN29e_Z8ysF8gaAR0U3mUM',
  '2-1|1|teacher': '1mebygJcN2yZ2xCpVd7Hal237HAFH5x-W5keDZkoMz2Q',
  '2-1|2|student': '1iN4v6-CYl72_G2R96MWO9Pc84VcbznVb0hHVfwKstiE',
  '2-1|2|teacher': '1IM-BJbw5dc6bBKamLcYSgZZR8j51ZuEj6vDAMTEEWrg',
  '2-2|1|student': '1_wCQExE-EBEjG5B1AnPpsrtteAKLkiy1PqIdHxWXscY',
  '2-2|1|teacher': '1cgDIG5-nSNF-1jrSTUAFEpA8m-5IXzqhKEZ_F-PJW4g',
  '2-2|2|student': '18CVxoPpOIB6AIkDfB1PuGNVo8B_bOXUyClSQ2s2O-cI',
  '2-2|2|teacher': '1m32Kjdrp6lZz1JKQpdlAJcQiO1XFO5dIcHKmoJAM_4o',
  '2-3|1|student': '16gWti1SGXlXOjebC2cMcxIXQXkmhI3B3v5h1iT6jhOM',
  '2-3|1|teacher': '14jkaKdPJInl3WaCIWToP1SHfMRSJrby1AkpnjHeyjVo',
  '2-3|2|student': '1QO13mMZmUG0MZyuqnGWyk4-7e0jnTeivwuHJiJin4wg',
  '2-3|2|teacher': '1QfP-FWoAHZ5hHInDkNEF9nCQJVQhCDOwGEQxRFHZBFw',
  '2-4|1|student': '1u7ai6oHkTM0yZVrLDv3bLzt209UUDin9L2aLUTmJFJA',
  '2-4|1|teacher': '1b1w7K-J70MUaW6Tn1UOchRu6Cz38BKFy0ebRqGUdELI',
  '2-4|2|student': '1BVaQQrQO27Rmf9dTqbmVbQ-xf_vmjvAcm1ZtIJwIxmI',
  '2-4|2|teacher': '101BVnKBy8tLsNlx8AIOPHhgzwnvxiM5TG_Hm5HcpWHQ',
  '2-5|1|student': '1PHGsoss4-kwGBp-l05Mmlt6RbK9vvQv2UtZL09AG9Kk',
  '2-5|1|teacher': '14AHdhyEdjAU9ZBAK7P9tZh2yzT9ZwMwKonUu3qVeoBE',
  '2-5|2|student': '1jqMfUt4Y-7Tz_KWXZURWr50-FYSpvI8r-QuIVIkVxy0',
  '2-5|2|teacher': '1RIIX3mOkgPB28KOQs3b-WnXAxK-R7O_23MmQga_XufQ',
  '2-6|1|student': '1-4dsd48mS8-TehrvV62G8TXmv4dYKWSyd0KWzbZBsSE',
  '2-6|1|teacher': '16AQsB_EnF4SMePEbmZ7ijthUosyS0k9NsBmdGqiX5QI',
  '2-6|2|student': '1OK3HcvvDiKA31DpDaYQ0oPGysosmmznq9yleH6J7Ab0',
  '2-6|2|teacher': '1krr0edpmIGkzJRDX_wHiBWJlUESc88jWx1mvBg168Hw',
  '2-7|1|student': '1nxiEEJ4yvALEj9KHCedak44ZjgMM73i_Zkq3r0fDvog',
  '2-7|1|teacher': '1ot-c_GLgTI04158fwy2Nld_ghJQN9dsNBJcF1uGbPjM',
  '2-7|2|student': '1vYhPmgtm8FozPYGSDjt9O5lxoN6lsYr5glDdVXSX1m4',
  '2-7|2|teacher': '13xe6N59D_XBSik0wut8iY-eQv0F3VLTdKFNyFFmLn4w',
  '2-8|1|student': '1FtbRVCLvWul-MOMbCoyXuL146dFEsS6vU2Z_MbuYhBU',
  '2-8|1|teacher': '1uPkQA5LItmF9WtuowMYtsBA3UItxp1tqRPG-Mio-CYs',
  '2-8|2|student': '1JvO84XftXiZWwfjmsS6rDy1EF02_dMeUUk7ndrmwHns',
  '2-8|2|teacher': '11qm_neQCffXzHCPyOl9mu2NKpKarWEnTRTC6wmTPfDQ',
  '2-9|1|student': '1-2D0OFMnhgYck3HV58PVoUaumNz5_v8f4bQR_uRh_W0',
  '2-9|1|teacher': '1nXwAhGSVkL_pdHGokp4Jm7qjrDZuJHtxtRGSGlExYok',
  '2-9|2|student': '1JfYghTVVqtSr3GHgo_xVPwqvzY864SQKWcxuYPEBV2o',
  '2-9|2|teacher': '1hq-LWWoLBv6XJilFy_1A5hU_nk-69nH8WDUjGUxvEhI',
  '2-10|1|student': '1uqwI-3phLPckFkJXkIuMioqsMRhxrHQ5OxjSm0cSbXU',
  '2-10|1|teacher': '11ljvZQIlg1P88UNMwqY5I7-55VmJxrc86-MSvp2_qw4',
  '2-10|2|student': '1QMAYDJ9vIQQ0vYRiPvSZ5EDTYotkz2ic4uZ-owAVgs4',
  '2-10|2|teacher': '1R4-yOODRb0YSJq_tHEA0sHIx0ZxVgp7qF_ds9-DgpOk',
  '2-11|1|student': '14LxKMeV82Ofsg4iBg9LO9I0zEqzjOXoBDiZ1zOTBztQ',
  '2-11|1|teacher': '1Evq2x2g67Nd7lfnm3o5UGni8xZG79Vw8MAR23hVuE-4',
  '2-11|2|student': '1ZA4wFeQHM0vXd6s9jnVMyjoCz9saDMtxX73AKn9FaEs',
  '2-11|2|teacher': '1W4hny2IH469qJ5Q9YfXOh3bO0zR0sEvAlfNaP5GgSIs',
  '2-12|1|student': '1dAx7F-prX-bJyKXL7Z5xbH6U9EMHBZJnboMbKiBkIk0',
  '2-12|1|teacher': '1L7RP7Jit5Y3nxfgkhEfPyQ3o0Vd5hxk_3vZz_arwWks',
  '2-12|2|student': '16BqGnENhYFMGgDHMJztsrYbOXvpbnZXfIAbDfxSQApM',
  '2-12|2|teacher': '1uWEv9Zz4HIVr35v8lQimx9lPQBAtVv-ckBQe0CRKoLM',
  '3-1|1|student': '1rQi6FFkZRve0eevARqKhrWQx24av3vX-GlaGVZyrECk',
  '3-1|1|teacher': '1i1KgYjCcJr-XSbZ4IVSC8G67GXSivvKK6jKXaPrEKDQ',
  '3-1|2|student': '1NJNrCqQI-DSL5PTLJmH1EFSQGFxczt_xmb--Qk4uhZ8',
  '3-1|2|teacher': '1hf6Fc3Pvmy7nMspKrcfnxZbZxJTBRNAb3it9B6lTXRI',
  '3-2|1|student': '1maIllkgf-3NLVg2z1OEF0TEjyuyiL7mnErf2zCUYWbg',
  '3-2|1|teacher': '1KmrgzWwW6-pWMC5UXOUoVUI5hHLlM347dbt3Ry9rBU0',
  '3-2|2|student': '140XqPj8Pp6SherRdlf0ANENB9Ji1uVViXz9iAYlXBHs',
  '3-2|2|teacher': '1Nkcs4ZoHV1k6pvC6NHMsZk3_2tiPMauB2oN33xOzGro',
  '3-3|1|student': '1VJrIbd49vYP12qjYpRsEZOsByzJKnwq_v2Mo2LUX574',
  '3-3|1|teacher': '1hGk11yWR_aIpmkj-EjcJVmvr0EFDv1xpuiEr1t7WCME',
  '3-3|2|student': '1jToDRIs8r2EPfXvLw0QzVCaVspk3XbG81dCDm9U1Ux0',
  '3-3|2|teacher': '1QvxX_S-FwdV-AKQ4QIPyRyN5j_1_d5a-j9ajABlJBX8',
  '3-4|1|student': '1VaGCYydRBESNHMk342rvwV2USgp3o4estJGJWDyyP5w',
  '3-4|1|teacher': '1IvTWzASGhZ8lQXFNyFaTRuljH_yhbwVe36e2vtaOXkk',
  '3-4|2|student': '1igXCVcdDmI-JTmozi8utDknHt8GtpTQrpbEyrR6IXXc',
  '3-4|2|teacher': '1i23iXvGbM0YuovG4hWRtRNJQVJT4q2mFPC6At2WAt9E',
  '3-5|1|student': '1Dnh66UmpZ1nrpAVNqxw8lUpUZ3af_kAXRyV0AXLaZSc',
  '3-5|1|teacher': '1VIWfawqBy-f843hhrbMIF69ZqK211muIZr5kgo4s6s0',
  '3-5|2|student': '1r34Z4jTmkTnqhBqfzz_iAmjKtfiliryXiPzArGwuxZM',
  '3-5|2|teacher': '1WdV9tSdKfpugoJveK5l_lsy5bez48UVpxFlTjWkfnY4',
  '3-6|1|student': '1_0yLkyVPYEnGW4oCw-3e1SWeYlYYJndPv1QLfSrJ-s0',
  '3-6|1|teacher': '1Y54WKW1ZZCqbs_R31ZAAkTigipR99bJayN8s6FCw5RE',
  '3-6|2|student': '1Q6IiS0pLVtbGTlIEEgbHW-WAenNpwWYUV0uaVrHtvZY',
  '3-6|2|teacher': '16Lu557JqJYjVGqUubgkjXotrFGqK0liTwoB1soH4nAw',
  '3-7|1|student': '1AS8sbro_zjIzX_yJq5nZYiXlfxAOgeLWL2DvPKd9jPE',
  '3-7|1|teacher': '1TlLF6Og_kmX-ULDCFic4e8QRtB2zpNaATaclp0WldoA',
  '3-7|2|student': '11TpOAx1aBcyv0u6C1Dag63JidFOVQ2yaRqoZbQDaucQ',
  '3-7|2|teacher': '1uljVb6CdUo_G4uSjiQLZ___h-U8YyRk9A0ZpfNEtZJQ',
  '3-8|1|student': '1L6ULoMqlqtfpvjZmWIdBucmXLhFGnUGDOX4Nyl39Qrk',
  '3-8|1|teacher': '1RBf4Yp0NpP-0WB0zK8XEqDDFkeYqYPhxu-1VNdYSmYc',
  '3-8|2|student': '1SIUMqAcHLL-iadQ6P1nKQXk-sXEHe10K6BfUwIxXHpg',
  '3-8|2|teacher': '1o_-6eOKfAfV2c2daVm659k8DA4i7eHhdkRLuCTnDT-w',
  '3-9|1|student': '1zKT6gxylV5oDydVtK-KX4yPVbIg9DH8Nzz9wFZ3SfVY',
  '3-9|1|teacher': '1DuCKzjv44LwSxn5vz1ktgGjJjLysQob1FwRyID9PKJk',
  '3-9|2|student': '1UFI-5QasW9bEexVGyEHheyqh0w6rahCpiOPIAv-W8hk',
  '3-9|2|teacher': '10iNQm6AaFmZAHPKD2zkdDtIiFWCALNz_0r3PaSbqevo',
  '4-1|1|student': '1Rt-ABdSDSolu4QddZIJLbnnp8Nbkj8-N8bU_ojisb1s',
  '4-1|1|teacher': '1msE93QtP-zY9dijFtSKWBx5Ivpp_stuo2kVK7sbHGgw',
  '4-1|2|student': '1yQSYbHiImsB269In7r_bGmNFbZ-6sv2ssfnaAwqUYNg',
  '4-1|2|teacher': '1YhXBoOzitzmfKIgEN0K8bxhCLSda49T2xqfsZaayehE',
  '4-2|1|student': '1vIbLNvR8cO7tK8j2A0LmfLiiFwtpXb6N_al4Zijr_WM',
  '4-2|1|teacher': '1hs_XmF3jXqC1I9nNQzv3_j0iY3CkkZRvY03ugIZXB5w',
  '4-2|2|student': '1I7hh-HJf7rKMgSZXPIB_u5WFCKSxjOFR6K6QKS9g74U',
  '4-2|2|teacher': '1lqYfz2WZ-Tyyza9vBzPM443ngAL_gAEJNGynDuspSnA',
  '4-3|1|student': '1AN3P1l1fiRNWoFuyCde7EtZFmbcxjqTbgFD6yyJZ9rk',
  '4-3|1|teacher': '11fBt4dFur1ctTe4SW7JhGFVLmshqSu_9EqfTLKztMLE',
  '4-3|2|student': '1hjZzby_ZMPCx0Qn0VheicXb1BQDizV2sSyUYhlad5kI',
  '4-3|2|teacher': '1KEqGgMDZ4Oyaq3Olf1Dv6uLJmL3ijRVZJ4DtWGFgHmY',
  '4-4|1|student': '1Qfb93azgoBFJhbPyLhDaDZgVYGIc9Lhuor_b5xC4EmY',
  '4-4|1|teacher': '16aBizyThO4gwdHk6eMWBsGziUSaIfPZKGH5D1ptU3U4',
  '4-4|2|student': '13E6oAQ6Jo9Z-If_3HlBFy4dy9Uoycrb2Z_8fYVd-EeI',
  '4-4|2|teacher': '1Bj0PxeraTOPUpVrmhPxkTjlqmyra09sw0mMW3xsPzeA',
  '4-5|1|student': '1CicQaRIKj-GDOPRuh2UdJhTVovknx_eAr7kfXl6vf54',
  '4-5|1|teacher': '1yInvKcESLZMU6Do-ny25noKbvH0e4MOwkUeJC35wwL8',
  '4-5|2|student': '11PyBtsAbU-nWs6Y21Zg2fJ9E2uVOT08ttNUW9XRVVrk',
  '4-5|2|teacher': '1Chz4jzKuPQUQM_qjiC2uJ4fWM6SQrgNiW4GmiWiGtts',
  '4-6|1|student': '1TsnE5fgUXGcJDgKay570fFyQIriXf_-Ct7mgOe70ef0',
  '4-6|1|teacher': '1e_ffEVoSxF3g_v40fRNq2wmKE6A-tmZea1203Qr-Yco',
  '4-6|2|student': '1_REbwkSYuhsRY9fBkwFjMcRNR4NJ9WYVa_P3Pci9as8',
  '4-6|2|teacher': '1XUA6y7YvfKiHbYhb-3R-Sao-uYYaWxnL9paiwlXzd5Y',
  '4-7|1|student': '114riZYLYlV4_1kD8HbLei995gOUGdS2QqmBMgKJlP_o',
  '4-7|1|teacher': '1dPg8_6ep_pwCvchXL-_UyElTZV7Ps8DzmFWzb64j4LU',
  '4-7|2|student': '10rvSpK5g5i0up8KBX_uTmXTWsyhLuVFc3-yDFjpLLo4',
  '4-7|2|teacher': '1ag3jTmw29b30C814ypVSQdshxDFRA0X9lsPmwVbgL30',
  '4-8|1|student': '1iFSQ_dEZpWNQEROO3gUb6FYSrnyM8SPndvTNKpkbxGo',
  '4-8|1|teacher': '1-KbyDCad-1PK-zelnR4dTXwZaJ-jTsWpJK48RB5EShM',
  '4-8|2|student': '1P8G5HvHYQDSZZTt4abxd9a6SY5Zne79NdXXCUhSggHE',
  '4-8|2|teacher': '1FG-XVY9kwOGZKr1oDTMtt0momqek5Lbuo-3MXITouyg',
  '4-9|1|student': '1fztiP1epBlThqvnynCn4khbLPRjW0yYuS1ic4NNdzRc',
  '4-9|1|teacher': '17CElNzO3Si6P_BPwIUTyzx98FSX6uxJwYt8KyxQNhfU',
  '4-9|2|student': '1YJ8-1weY7hN5mTywQxJMhHWyo0BhKBbc_mL9m5Mkidw',
  '4-9|2|teacher': '1xr7XA-afICM9H9bqs_AHTKr_I7mp_vjeF0EWYczLcnA',
  '4-10|1|student': '17qxRIT7xd73_WPpiy3CJ6M0cuVFJfS6lvT_TQ-QA-f0',
  '4-10|1|teacher': '1O6Ss8_zcFrG47_Rf50cD22sKPo7Rf90bmUsQ5DOdv7Q',
  '4-10|2|student': '1ETffra_rpGj8-uJRY2KyxgdMmTfyUg95zPcFmV-jd-0',
  '4-10|2|teacher': '1X1IVxhGhzJg-uC7XLjC3W-k249DqEqwIoGSQMGD6AOs',
  '4-11|1|student': '17TnXse123F5Oc_69XQMKWYwAOyuX3ldQxq8Dv9XNisc',
  '4-11|1|teacher': '1cKIRh2Nml90gEsOgWZpPCA8KYE_gkvxPFtzegQ50wn0',
  '4-11|2|student': '1C6Uuibw-gQnYEurpUWwl0veZQwyJiGB-yV9EL0tKelE',
  '4-11|2|teacher': '1tSvjA6Dz6KnDD7zksShS8PDHgv2pIHyDZniK-FlE5pg',
  '4-12|1|student': '1jk4AmmPnMF8d3W9L0CUfzB-WLZ4wRQTOW0EatT3046Q',
  '4-12|1|teacher': '1qXjgZ_CXtlDH_ADlFqY6r4_mpg7XC_bQSt7LtiAcDxk',
  '4-12|2|student': '17UEwTVaI3gb0SIeoZBPPGXWT6CIBi6-HCmYKBD4R91o',
  '4-12|2|teacher': '1asCYnnM3_AI97w0iwez9VxseKNvK_cfEPlUfNRDtXKc',
  '4-13|1|student': '1aNJav8Zq8sCWOIWSTyRUBZbJd6xAWjiNll6t9duT9ao',
  '4-13|1|teacher': '1046uRqYAumX9Xc-wlp7GT6PBisfq83eakFIXCDI4jsI',
  '4-13|2|student': '1x_XBM5_27GYKevwrQyo0211pIYCMVeU0OoPVsitqCH4',
  '4-13|2|teacher': '1xP6xtaTLa-ZcgtoueDPF-GOk1sbcmVKzd3OguK-Y_Qg',
  '4-14|1|student': '1A_2LDqcgaHxjvNT5OLxNVKqGuNXZ--sa0JuszYEcjUw',
  '4-14|1|teacher': '1ZXwGjQztBCMU1Qel55TBMG6faq-zFs1u5pZmo47MgVc',
  '4-14|2|student': '17UaDY2XXz95XxL4Mw9P2hQshiOqrXs3P9G5dRGnIFWY',
  '4-14|2|teacher': '18PM1RcQA8BrDl5P3V_wfIl8mIdegcsYmEJHPlf_kI2E',
  '4-15|1|student': '1oFHVfSSA1tVNARwHiNsbyUBVHwkK_ljxAKOyQEOguFQ',
  '4-15|1|teacher': '1MD7_uXKMszw7oCxJQtw-VrK0erghC9dveLOZqp7h_tQ',
  '4-15|2|student': '1X6S8fWa-CYJ4FPs0udJHswZ2sYfQ9D-Lr2P9Ig7X2xE',
  '4-15|2|teacher': '1Ol4YrUMIE0YSF-V-4AwpLnb0-_-qQBlDYDbvzgMkzFs',
  '4-16|1|student': '1CGqibTG24Rb60ey02zWruJye9SrbaQ5rl0xlyUzt-Yg',
  '4-16|1|teacher': '1tyPq_e2lQwviyFWK0NxJuUa3e3YcxnYVeUnEGGDIt3E',
  '4-16|2|student': '1OHwhS4HBxbv7UkJ5g0W3Lc7-bib-3OsXNn193fQ6A5I',
  '4-16|2|teacher': '1p00KEe74jsooXd_KIi02vqX0UpO1Iv-UGloV_j0V74E',
  '4-17|1|student': '1ZyIkYxdHZBRk4NbWoYQwgBiksKd-i7C70niIG8g_4r8',
  '4-17|1|teacher': '1QYg7nDXKtEo5eev8JGR38JdJeXpoDJzoMWKRTX7jp00',
  '4-17|2|student': '1_MOX0L6coQdNzCnZD8P-M797dJ9pjS_O7v40GhQM0u0',
  '4-17|2|teacher': '1SgUtXZtEQHipjJAyeYgT13eWOy6qH2WwZYM5CJUFdn0',
};

// Set by whichever generator first writes real rows here, so a stale map is
// diagnosable from the file alone, same convention as the other two embed
// files. Null rather than a fabricated date: no generation has ever run.
const GENERATED_AT = '2026-09-04';

function slideId(lessonId, day, variant) {
  const key = `${lessonId}|${day}|${variant}`;
  return Object.prototype.hasOwnProperty.call(SLIDE_IDS, key) ? SLIDE_IDS[key] : null;
}

// The embed parameters live here and nowhere else, matching both sibling
// files, so a future real conversion needs no new decision about the embed
// query string.
function embedUrl(id) {
  return `https://docs.google.com/presentation/d/${id}/embed?start=false&loop=false`;
}

function count() {
  return Object.keys(SLIDE_IDS).length;
}

module.exports = { slideId, embedUrl, count, GENERATED_AT };
