'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AP CSP TEACHER BUNDLE: GOOGLE SLIDES FILE IDS.
//
//  GENERATED FILE. Do not hand-edit. Regenerate with:
//    node scripts/csp-slide-embeds-from-csv.js <exported-map.csv>
//
//  The source of truth is the `AP CSP Slides Map` sheet that the Apps Script
//  conversion writes into Drive (one row per converted deck: lesson, day,
//  variant, track, sourceName, slidesId, embedUrl, status).
//
//  WHY IDS AND NOT URLS. Every other deck URL in this repo is DERIVED from a
//  filename convention (see config/csp-slide-manifest.js), so one token change
//  updates 224 links. Google Slides IDs are opaque and per-file, so they have
//  to be stored. Storing the bare ID rather than the full embed URL keeps the
//  embed parameters in exactly one place and means a malformed URL in the
//  spreadsheet cannot propagate into the API response.
//
//  SENSITIVITY. These IDs are credentials in every sense that matters. The
//  converted decks are shared "anyone with the link can view", because the
//  paying teacher is gated on their APCSExamPrep teacher token and not on a
//  Google account, so Google itself cannot do the gating. That means holding
//  the ID IS access. Treat an ID exactly like the .pptx URL it replaces: it
//  must never appear in a response to an unentitled caller, and never in page
//  HTML. routes/slides.js is the only thing that may disclose one.
//
//  An empty map is a valid state: it means the conversion has not run yet, and
//  the gate falls back to handing out .pptx download links alone.
// ─────────────────────────────────────────────────────────────────────────────

// Key format: `<lessonId>|<day>|<variant>|<track>`, e.g. `1-2|1|teacher|cb`.
// Variant and track use the route's lowercase keys, not the filename casing.
const SLIDE_IDS = {
  '1-1|1|student|cb': '1q8iSDsi5gC7WWjBq8L7wK2zGee3ULI_eIyXjAMbFaO0',
  '1-1|1|student|deepDive': '15LYP677crzplYL9LSzSdE8gbPNENLGX0Ipc02lIIwvQ',
  '1-1|1|teacher|cb': '19PAP9iWPvug0ske8BBqU-pVoXot85mhh5zFAUJzOiLs',
  '1-1|1|teacher|deepDive': '1F2DSvBUhWhO3jJOQXrzcaePzc0iYr7UQ_5MO1Z6dZfU',
  '1-2|1|student|cb': '1VnOu5YFbxhMOKgDMS6190Imv5WJTBYR9QW0SMfXnhzI',
  '1-2|1|student|deepDive': '1xbnbbRbZwQZEx2sKe2HcZgh-CVHXY9O_Fb0uqpUR2YQ',
  '1-2|1|teacher|cb': '1_q6Tlq0tPpsKwG8AI5c5l_7baNBr85EdyEr6mKIhOiw',
  '1-2|1|teacher|deepDive': '1s0ZINranuMzE5hn8xiDAUGBDhVtxXyHsed88XUpCiqM',
  '1-2|2|student|cb': '1Fm_Av1I00ckL10NbOLaZjpgfZEbnwp5sBYdVen1w2DM',
  '1-2|2|student|deepDive': '1vpkeiXpBCY4l5u5uKSxtiCJNPxjbCBO1dHeb-xZcDY8',
  '1-2|2|teacher|cb': '1YM7oA9p2gVzeRlTnlhUKh1zSG1V7htV0Qts6a3CSBTE',
  '1-2|2|teacher|deepDive': '15N8uZxTfJ1i46xmLOHZS_YyjEsJGnS0OqP4E-HcFYlc',
  '1-3|1|student|cb': '1TSTm2tOuBj8dX4acLGtNehpabR2RLDRAgKtaihDgakI',
  '1-3|1|student|deepDive': '13SZubvU1cv-tClQFqHJuVig7tIZ22s5eZn7YHQsBaOM',
  '1-3|1|teacher|cb': '1gbmly23o4_E9NkUo8vmK2_BNTVA61kexUtgKQ0t30D8',
  '1-3|1|teacher|deepDive': '1uLsoMVkfOFYNCiujv9jmCb8pIEpTFQTgYZL1WRpE2Uc',
  '1-3|2|student|cb': '14Fhrw_aMvA_wlPclera57JXcgnEcMwjQzqxDp3M4eFM',
  '1-3|2|student|deepDive': '1uX_h-oLIgX5I92nJ3RuTQsVOhxxldwR_19RsT2ZaDP4',
  '1-3|2|teacher|cb': '1oHZB3ZdApsean0M8bLlI_hsbGuYWmbzK1qKLYGwngiI',
  '1-3|2|teacher|deepDive': '1B2-VD4cGex-saWsvqIClhJOp50wWLy3WMN0Ov-hPHts',
  '1-4|1|student|cb': '1-BrV9EffLShkpgJE_pneFqDAKw2YTVxl3UaJnhd-KYM',
  '1-4|1|student|deepDive': '1McGkNKmXqLupPxZr5BoBpfYu78LvhJAO6MT4vGQ7hq8',
  '1-4|1|teacher|cb': '15Nxw-T3-HaXzCNRgY-Bh6TcQ-f-f8zl9oFYY_qaePMg',
  '1-4|1|teacher|deepDive': '1HaG7d9MN8klwxTKGUSBmOOGh70MQYsEgVTSbrT0D3a0',
  '1-4|2|student|cb': '1SIi7wjSbr3d8PfbLU6Qz1tOrUcFXeY_o785wOh97IwU',
  '1-4|2|student|deepDive': '1mjg4VlJWeqXINe2ej3dy2335BL3nmPwCHbfPEfKZ8wo',
  '1-4|2|teacher|cb': '1chimgYavYv84KHgJbZXx85FO3a9L3oKVYp9BzOYLgPE',
  '1-4|2|teacher|deepDive': '1lXjy-HPJn9TcUlvGTKMfaGomG2XeKGty_Bov528KvCc',
  '2-1|1|student|cb': '18yM9D7idEDy-x_YgJTVNmcQZ42uVpqBQOMqm4jNJtyo',
  '2-1|1|student|deepDive': '1unJhpnJUPKajDBQsHxeEG_uoRzD5SB04RQzZJ7U1OMg',
  '2-1|1|teacher|cb': '1uc6mC0IRNJqE0WEqlMk0UyYrxPI_B3mrVyXLJ6wLdF0',
  '2-1|1|teacher|deepDive': '1SAXHEMTsNdt7pBXc4-bLd4QYZLj3DXAaTqUu4U8I530',
  '2-1|2|student|cb': '18XuFvXxeWx1y_NpZryGEGE8KD2NCxsaHd7mwHP22Cc0',
  '2-1|2|student|deepDive': '1BUm5ujIENuagrb44TI9RKVB1SDTixWQaUa3VkCXlefg',
  '2-1|2|teacher|cb': '1gVYGRCQ3M0v92ZuwrEQVR5PuZZjyauK64LOtoiySnYM',
  '2-1|2|teacher|deepDive': '11w9tlTmiNLqlkXr_lF4F2n6ZLC-no4x8-1_NNr73EDY',
  '2-2|1|student|cb': '15ii-TODKk_ZlGa9hExlzeIucMfPYmILqD82eWcM8rNY',
  '2-2|1|student|deepDive': '1WFfl4eoNTnMY_kQcGrKo9-xuKB4_Gp8dABS-Y-rAyXY',
  '2-2|1|teacher|cb': '1hhn8RN8PI8uFe6Mh1PleFeIu1-Hru6cyjY1gKzOPk6g',
  '2-2|1|teacher|deepDive': '1XRXrbiX6LugnF5GIQ5nfcMv-tX0AIEX2KRsf1lls5Z8',
  '2-3|1|student|cb': '1rxSUpplQYMGIkUQwI7aUtp0AoX3Kze4DZTk3yXsqL6Y',
  '2-3|1|student|deepDive': '1tZ6-SxkymFNzPS4oK-2ZFjev7hTvY8k4EIPN0oTvJTU',
  '2-3|1|teacher|cb': '1FI3aT7AwL72tXrtskzT2LALOWrw48Ty8Wqx4qtPRdXU',
  '2-3|1|teacher|deepDive': '1uOJV0KVceavTZiAlunW98dFuFCyr1HTvoCDiKBlshN0',
  '2-3|2|student|cb': '1KDVrglPoWHT8pzcUxX68NAL8a0kfF0MZYuvHlh0OTwg',
  '2-3|2|student|deepDive': '1tbrVCHT3hiZXn263wIn4KbU7FCZRGCRc4HDbvY-nVEI',
  '2-3|2|teacher|cb': '1NgiK2N7Yq9CN8-_pLVOkUy5so-7x-IGlM2gC4PTzl5M',
  '2-3|2|teacher|deepDive': '1vFSzXCgL6xNI70heFYHN_OXk9leRCuA1VwTgPsA_w6Y',
  '2-4|1|student|cb': '1cNdt1DmPbdYNFZkXitQmuEknKP7GrDhXm19Uv7JSQ58',
  '2-4|1|student|deepDive': '1ZfWIEaAkiNg9SxGd-kLzujaG9qF9b60eLU9pa8EMPMk',
  '2-4|1|teacher|cb': '1VPdlhT_ZIz4zULUUoOV9yrD2lZTJM73NHxXN7mjmP0o',
  '2-4|1|teacher|deepDive': '1Jkt4NgIQHhGbislGvjOH2XY2_9sFzsQlkzUezYzanlA',
  '2-4|2|student|cb': '1T6ZOVValRvGC9vvv5bscGTFxr60yxFy8lBYoewAq6Ko',
  '2-4|2|student|deepDive': '12Zdg48UxbKVdeWVLYL6wBDe_gi0mSQOiMTfgOveSc18',
  '2-4|2|teacher|cb': '1THdUGPMB89tuLHC3j3wBqkQm034v32OBk_yu-vlMaM4',
  '2-4|2|teacher|deepDive': '1QyG4RqfI46cZpJnnxeAmGp3zeU1cX-rqkAQRkVgK-MU',
  '3-1|1|student|cb': '1nJts6Mj2G_DeXOJMZcQn_lUzdzHtyF2DScy-bPHQBeE',
  '3-1|1|student|deepDive': '18AyuPdGpq44N50xjyt5hRY5182Pyaq8-5C0r4FPIHPw',
  '3-1|1|teacher|cb': '14WbSWfokrHAnqswptOO1kRs09hzJGl-bND3pA0TszHc',
  '3-1|1|teacher|deepDive': '1WfnTQeswgLjpiwT6vkfUlu3cw6Es1Z4CgFwKVwwTtq0',
  '3-1|2|student|cb': '1ok-Whzo0kRwDnvJfYXjHs9gnvrs22bKr1DZ8sqOeCbg',
  '3-1|2|student|deepDive': '1nL3tdZpQz24vlY7hzrDWV8vJzBMLTtlMvuGuk_mnv0o',
  '3-1|2|teacher|cb': '1tPh9sdc2raFAYg-DG1j_2_Su1w0AnuTWUdy_yKfqUJw',
  '3-1|2|teacher|deepDive': '1M1FhHd4WlI0kdMBMCZd8BN_fX8dr3tJZk4mINdWTLQo',
  '3-2|1|student|cb': '1lt_pvHeS8oZVJEFU98ZOkFUOZJzhMLveCZURII1xmEM',
  '3-2|1|student|deepDive': '1r4c2woNejW8x0n6VOBIwJRAPi4G0Icf6_LLKTHuMORM',
  '3-2|1|teacher|cb': '1ZVi5KbHplQzulN69AgxLeI0kPU7FVRkgpgpP9ASoAnE',
  '3-2|1|teacher|deepDive': '17f4J-5fFCcLMvZAPonItMZwFfBw0eUvNnnYodKyV3g4',
  '3-2|2|student|cb': '1sNRx64kPEjpvUHBw5TmMHBRWcshUvRQj992zT1rbJgg',
  '3-2|2|student|deepDive': '18qIR6pOzWHXB8uuPUAxEdgovQSobVHQtI8WrvgOpEY0',
  '3-2|2|teacher|cb': '1ZCkq7KeBtafJ24Qhzh3GWptryZtLE9UmeuB4kgtbipU',
  '3-2|2|teacher|deepDive': '1y5ZD-S11iz8Y1uOOxg_GQl9rcA2lUV8_8nQ5S2siR6M',
  '3-3|1|student|cb': '1bfKSKwaDGcAovC5TrTLs-FFm0QiWK-ev6wPTtserTRY',
  '3-3|1|student|deepDive': '1T4rqU9psEdkPbXjfkEi-IG0hIbC5E12K2vGjWnyDh_Q',
  '3-3|1|teacher|cb': '1A78BtImchOVqemgIUKyPiTocmT8aBy4_iiHiWZUjyh4',
  '3-3|1|teacher|deepDive': '1y42JS931a3l5jrv48BqTuz-gMbCYaz48Uo5iNY5E4Yk',
  '3-3|2|student|cb': '1O-zbeym84Ko9Jl8fGXo82UP_APDkRNr6lxxwmF_8NEY',
  '3-3|2|student|deepDive': '1yvFlNntQrezXAESR9oIrGBNke0JDzNR2SI3TZK6CDHI',
  '3-3|2|teacher|cb': '1gNomfCzYecpRdZiZyNe-Vhepl1dV_SDMooPdA4Ufi0g',
  '3-3|2|teacher|deepDive': '1HyVQqAdXC2c9CHV0DBuQ2xjRAkcFGdWlPQHfRJ1kuEM',
  '3-4|1|student|cb': '1gatlxTT-yXHBtfvJ0MAhgJG9k9DauO_GNk_SSgSt6WU',
  '3-4|1|student|deepDive': '1WNRmTQMQG5baZaIo0qSmsLvOUwSocZCvYqX0CswMmO4',
  '3-4|1|teacher|cb': '1MQ8nX9suGJ9ptf_C2fP1JCbn6PVemr0VX5RbD1CPwM8',
  '3-4|1|teacher|deepDive': '1auOceRMfSFG1RVhRCxdvRN8Iujp4Ua-eLs-CkGxo8Ys',
  '3-5|1|student|cb': '1A6YiYWxF-6QK05jFWjQ2gLDKt6QXUaul0-oOGhR-oF4',
  '3-5|1|student|deepDive': '1qd5lSu7MzJqt3mdhUKZJFQlHratItwqDodwfG4ikMw8',
  '3-5|1|teacher|cb': '12vAP-1_G7dmcli5k64D8MKtQJKYA4XhlbjSE8P9DfTk',
  '3-5|1|teacher|deepDive': '1UAWdgpXluhAD5gsZemgfAmmSsb7LAH2iXGMd93HZPKg',
  '3-5|2|student|cb': '1PZarAsrMAP6CE7E1yEjw0_X1bFvcO9UNpXPyMIfGIno',
  '3-5|2|student|deepDive': '1hF4G-5eTrEH5sJs0aBLaCLwz0B_dTMiElSpnQ-ZS59Y',
  '3-5|2|teacher|cb': '1LYZu3nlUXj-aNiGyhOdPehRTLZ9ge-IAiAl7IMicE-U',
  '3-5|2|teacher|deepDive': '1zJQ4-pdiRV1NbtlPrFQbOI6Y8YTFVjQmFx4kHKmKcKk',
  '3-6|1|student|cb': '1OIYh8rhm1WiliZ9qIi9jTQUA6-2j18KqPgqN-OVqcEA',
  '3-6|1|student|deepDive': '1V1eTDriTttyNkOvUm745_uy9qjDGvQeme3qjgq4E5Rs',
  '3-6|1|teacher|cb': '1gCJ3BxKJsTu30GK0Icc_ysWhHT7Sb0vdDEBEpZqtWwM',
  '3-6|1|teacher|deepDive': '1fNkdhZZS99scq0S6LnLTbhvZFeR09oUZDtLSCnXiazw',
  '3-6|2|student|cb': '1Oc3dH1derJQ6eAajhR3IGsnW37P3i5ddXWk2uNRdO8Q',
  '3-6|2|student|deepDive': '1NlhZWGRM1sy_DuGeO64FwFt8winq7y5U5lF6FUH1RMI',
  '3-6|2|teacher|cb': '1i-Dj3Ki7z34iAqJqvJd8i9hauHvIhnv_l-VKcW3HMIM',
  '3-6|2|teacher|deepDive': '1yEmsTLExT7yILd8Kjp1IxkikedleACJUhXQEsBnd47A',
  '3-7|1|student|cb': '1PQK95liFOGBrbDNdHs2vg19h5UoWhtfABInyEOSBbVU',
  '3-7|1|student|deepDive': '1OHLC0GLRJPJqH7W7v0WfPR8LgG8ivCBDA-QOPdYOoFI',
  '3-7|1|teacher|cb': '1cmBMsUFBbZaIJooj-ML8EAOAB5Qh4mnS8-QW-JgAAgs',
  '3-7|1|teacher|deepDive': '1-LRWsbID-owAv4zk44a3P0YdPBvw_ZFQ6JfKhV2cjys',
  '3-8|1|student|cb': '1Ur5yWmdj8zE4-iASwYKkUviGTagR4DlIVSPIWXJoqlw',
  '3-8|1|student|deepDive': '1Gv97ckV8UOpJla0iSFqkBxoftJjMmvr7wf7Nh-FkL3s',
  '3-8|1|teacher|cb': '11u8Zb2Y_cNTm5Idu9aynShlhqJ83TbxRHXSom0wbg_c',
  '3-8|1|teacher|deepDive': '1snX92kBE7muD1u1RqP1MTUfhU0d8RNhpnTQGsynuoaE',
  '3-8|2|student|cb': '1wQHfHjfYQftxfPyzorQaOENNOaa0OQtpbXvSpZ8EHCY',
  '3-8|2|student|deepDive': '13yVCDlWxiA1P5WoD-O3o8sIZwnJYyNrtetrdDmeHsn8',
  '3-8|2|teacher|cb': '1drSX1nSxfjT4Q-u4zR_TyqhkYR9qLGNULy7FPypIlJs',
  '3-8|2|teacher|deepDive': '10SsX76FSitD0rNg-wnXOmZRpKTl9fulHnghsiandq6Q',
  '3-9|1|student|cb': '19dLJUYiyu-hrj0jq24H0i4fI0B73s9wV-bHPlrcYG8M',
  '3-9|1|student|deepDive': '1JlBv9VyMX-HAUWXZOJB5Q-TtSI40FWCLLbhKYcDy3YY',
  '3-9|1|teacher|cb': '1co44UHeyW6IMLZZPJxjD_teJl0hxtds8ZJb7Xn5tuG4',
  '3-9|1|teacher|deepDive': '18SFlGm8jFHaN2VWLP-A-dzT0WtLAvKLDXcNlNCwYKtg',
  '3-9|2|student|cb': '1Zg_pRmkLNZgi2SNXmjTHpnyJ6vkjM7P1ZXWSw5LoAQc',
  '3-9|2|student|deepDive': '1lT70LhYzQseAZAoi-4q0m_PzAKjEMOrPSNIrLp3vqAM',
  '3-9|2|teacher|cb': '18uIxb4vctNjXxreCLOHxLlDJtwcZGsBrRa-6TDLsvsw',
  '3-9|2|teacher|deepDive': '1gizM3pMIgPrqkEFZsxb5sVVdzEfDs5CHLPEciwoM78o',
  '3-10|1|student|cb': '1rpkNZpukX7Y4wWMl7PdRSxBO7RvzrFY6NVddyAWd3pY',
  '3-10|1|student|deepDive': '1t-Dcenio_jHPb7ihp4JZnY502OCnOZvgGnydi2Qbebw',
  '3-10|1|teacher|cb': '15SNooBy1CEVn-09k7qra7bqA6IsCbiU96k7rjUd6yX4',
  '3-10|1|teacher|deepDive': '1ekunfD70nwFTzaSXtnYNRLams2sC3FgE_SrmqDOA4aE',
  '3-10|2|student|cb': '1B1cycYfSvZKvV_XTqqmT2s4zKsoBag1v88teKnrADUc',
  '3-10|2|student|deepDive': '18PJU_XchPxv-eJttecw0E6FUtzLtpWz4fpds5ci0lzs',
  '3-10|2|teacher|cb': '18nX_2Wo8EkcT8R5ki9Aiiig_ACOcKWG0v5pmft1H8S4',
  '3-10|2|teacher|deepDive': '1jRK0Tw-DQf4G3BeuDxSK9o5B5OOKlr8TBy_SN1IDp1A',
  '3-11|1|student|cb': '1T05oPo2NBi6GIEDulIHBBOHc-jz8KiC4xWKVu1Stt6Q',
  '3-11|1|student|deepDive': '1iH9SEFn3OYqorCUFzwFSw2RssDam22ovXj_lk8KDIJs',
  '3-11|1|teacher|cb': '1XuEHYtPjd_JSUG63AaMKG4wqnpHpLcTCMZV9rZLtxQo',
  '3-11|1|teacher|deepDive': '1--LeYJTor2bdvKcp4w6PNMcdHL_55Lqc356aVaazy70',
  '3-12|1|student|cb': '1bpyQ_JCN__rqL8xlGuimQCGOs4g0nEBGXHsPNrcAV7I',
  '3-12|1|student|deepDive': '1UCCYWq5Imq5e3gsDFTemHLuTQ526OVk0TYwqjL6Xrq0',
  '3-12|1|teacher|cb': '18sH_LHlBO1Oec60AESVKcJZuYRyc1najYNI70b8QWyY',
  '3-12|1|teacher|deepDive': '1F1nJk7ezPNZCUh7iYkzamqb8H2lqiyCQQqzrobkpuyY',
  '3-12|2|student|cb': '1Yp7MAEozvbrDBgYrPDqKe3AjaHQFiAkllEj1Kf5Zj-Y',
  '3-12|2|student|deepDive': '16nposxFLBOfXgUXiIBio-C56x4AUm9YXE0qn4um00KU',
  '3-12|2|teacher|cb': '126TxsLh6e6nMMpz2qLbqAzp7U6_sVV0Uf4fE5TIWjv8',
  '3-12|2|teacher|deepDive': '1y3t_qrnYh330kryzP6t4SuIWsnvMGPAADiIG176m_Sw',
  '3-13|1|student|cb': '14lZ_5G-jCSFUErK0YcVh17kLrI1mHzq6gpnmPsc6WOU',
  '3-13|1|student|deepDive': '1XTimu5AuRy3KaoDGtbwfayknZrUIOXA3jzjhFmtqH0w',
  '3-13|1|teacher|cb': '1XTEO1sZPCwS7VXAHQNd8HE3H_lf6RVXOFdi5NFM7ePE',
  '3-13|1|teacher|deepDive': '1TRM-X6RV5f2xlo2CPRM2-A45GehAoZIofV65fIppuko',
  '3-13|2|student|cb': '1nB9qbKm_JhiRT5o8ErsDS-nlVTUBPiL9yxVRqsOi3B4',
  '3-13|2|student|deepDive': '1a3ASTaJzgRNxmGgX4Vk_dIJPJuMbdF3q2bqCqNaTItI',
  '3-13|2|teacher|cb': '1RacgN8SyknjK5VKAsQRyL6kw6ijQW8klK38eTpcql2c',
  '3-13|2|teacher|deepDive': '1sxRISi91uCziIty7iVl5VyrvyUNWIRCikxvb_7sm7gs',
  '3-14|1|student|cb': '13vJ5u4uMdmJhGCqHG-ixkQlUtmy-G8xVcejyvJGTB2M',
  '3-14|1|student|deepDive': '1mT-Riat8C9_iD3mCh9abxPsXg1oR8tkbgXwlQbsf8nM',
  '3-14|1|teacher|cb': '1U7Y24wWTKCYrzvB8FINaKlcSV0wUVSLcnQcvL9emO_M',
  '3-14|1|teacher|deepDive': '1OiJZq-zXZiwxsUL97b_QwI3I7bblCTquZ1ZU97rjxXw',
  '3-15|1|student|cb': '1fcvUgd3XL0nV-HZdZ65HYJ4c1Un7GU-Jc4rYx5daZO4',
  '3-15|1|student|deepDive': '1EjGydML1XSRgUQLVfkVEvUsZod-fEknlJxtS_eh71iw',
  '3-15|1|teacher|cb': '1qlvb-HIjK7JP6JVk6wGsJ73FA1thXtsEWesJTSpZJpw',
  '3-15|1|teacher|deepDive': '1upt3mMfJTxpnKyvCmjWJGU_du8y5LY9HNZhG1vWtn10',
  '3-16|1|student|cb': '1WVMmBK70v8t3vxZ9uWYuTGQhJeJhKYhkssABILG6qFo',
  '3-16|1|student|deepDive': '1Bx0p1-jRIlBmkk3W_6MuulPw43EcxOadhlg54JM0Dlg',
  '3-16|1|teacher|cb': '1GBWFGLs4kK0lRzmc3Xou1u-eVccUldj59KuJdi4N6tg',
  '3-16|1|teacher|deepDive': '12mHI48HcDxQidvbly4aT90HnjukPJhkAQIriMiHh03s',
  '3-16|2|student|cb': '1qFV7EqUU7ZTGChs86gbLoPQP1SgE0We1XMm2tITg2O0',
  '3-16|2|student|deepDive': '1PlVdjI1VesC8ox5xKKIGStE6UriCgwTZ_EVuY8BA2e8',
  '3-16|2|teacher|cb': '1Bqeu_pkg2awwILYF-oQydGFPyj8TLPqYVQNkfevRAqE',
  '3-16|2|teacher|deepDive': '1BgaTxcGxOMYfW0LLf11v1E0YZN1V0q_qqtHOLuNOuZc',
  '3-17|1|student|cb': '1qeSiYLywh3-bfSYaY63lTb2pX2lswutN_QhfKpAzzBE',
  '3-17|1|student|deepDive': '1gR_kijJmDSADTH0feRVQ5GQJY3Q0yHSR1a6sjsEDj9g',
  '3-17|1|teacher|cb': '1b08XG-t2v-gDHV8zUiouAoU5L81BfrRtGUMciSY3iH8',
  '3-17|1|teacher|deepDive': '1k5r5SAWs5TdGvGKJqc24PMClu_CvxW10T9zMXNAaeVc',
  '3-17|2|student|cb': '1tVhOV2GaW8UKutDw93tVe0IA85w3-1sSLUsUC2jXoZw',
  '3-17|2|student|deepDive': '1Bw0hgTMnsO3pHzaGpt7N65rBygGRZ8GngELHDWJgQF0',
  '3-17|2|teacher|cb': '1wYKZc4DDei7d9MiHa4PpY7h0KQOQDKpjyN27kGJqPxI',
  '3-17|2|teacher|deepDive': '1bvV6HutdZ0KrGVrB9PLa-vwHQnJYUr_ONKaIhSo1Bgg',
  '3-18|1|student|cb': '1p-Ch_eynFG5tqbw_9S-XyJMjEZTEXmVWt2hMTG8Mn9Y',
  '3-18|1|student|deepDive': '1dp8f977O3GwZgLXVNGu8TWspAZZDdqDLup8V9QW61cw',
  '3-18|1|teacher|cb': '1GGF_0ka3gAS8wdOqaRIfVbzDFEE8Q6TNkgxOIkfF3ME',
  '3-18|1|teacher|deepDive': '1wRTmHBxjq7ooEwF6jTtqjG35ox8LhCoP1tXPKGTxMYA',
  '4-1|1|student|cb': '1GurWC7cE44auz36TMu18cWtR0rwDHg-jpPuasFYYMtE',
  '4-1|1|student|deepDive': '1G8HwBmLPx8gRUtzeN2Y5GIdPb8EbUnGK836_-zMWMUo',
  '4-1|1|teacher|cb': '1n1bItc_aiCMLcVt-FbdKhymfz5W14AQ8-8CXumeUIgk',
  '4-1|1|teacher|deepDive': '1jlMaxZd3ODR5opcj6EWdrJHSKl4EWudQcKyaZuxFW7k',
  '4-1|2|student|cb': '11gHhqL0LLsQHFZh6QubiZmCF3R5f-bN3rl5HdWmFCtE',
  '4-1|2|student|deepDive': '1tf9SW-j3yXJ9yCrpo9jHTYJzZLohtAOHzgo8VEKLQU8',
  '4-1|2|teacher|cb': '185S-RETUmJfi4c27m-qQ0KZ51tmHZZQ54Gn5-LuLmgE',
  '4-1|2|teacher|deepDive': '1o3SbTpIB3OQHYPPcoZJUbqpWp0_3AAxnbJIPGdMWcEw',
  '4-2|1|student|cb': '1O-aSOO2bgtK0-DVVF901jw7rux_DoB3F06VZ8oDQStw',
  '4-2|1|student|deepDive': '1vdLEZVmSGyZsdZWT5Ln_m85790CBKhi5bUJhM-_8pdc',
  '4-2|1|teacher|cb': '1fKwUENpecLRNPAq1JMBB0F8roVTzAmri29yPlZ93fFU',
  '4-2|1|teacher|deepDive': '15RwaGlwSAzYVCTKFziub2mi9HAXlgLFuEEnyDN8d6Ts',
  '4-3|1|student|cb': '14kaPnuEwk4X6VcIPFCSm7kiE1fbYtV2bNVKPE4MH5Q4',
  '4-3|1|student|deepDive': '1NNDZtuw06H4394rZlEzipHNiQZmZdJedTGOC5n3VG9s',
  '4-3|1|teacher|cb': '1XwWSb2_spkQ3Uxa_W6aHMsNFdsxEWNYEwmxaC9OUdto',
  '4-3|1|teacher|deepDive': '12vdwnN7zNthd1HbkmjXfRw-kM4fNBPWyHrDBCkHrN-g',
  '5-1|1|student|cb': '1-uimLhWPjY5OvZ83-nXHM8C4VdO9smwP2ZRFKqV5G0I',
  '5-1|1|student|deepDive': '13u9sSDbPIj7IatrRAqPYveLlz55K0-3yqUBi21bh8e8',
  '5-1|1|teacher|cb': '1IeoceB4R3j6loMuh0Ivis9FrkQQ2iuHqewEu27epoCM',
  '5-1|1|teacher|deepDive': '1pxh07MDIjLzadOUY0BVij8li1edjesoR9-s3Iw4156g',
  '5-1|2|student|cb': '1fjhAQRcqBf-lxBb7gQMJXwncD2wKNIUT2YdlRPMx2wk',
  '5-1|2|student|deepDive': '18uWTC4TYeokmEswp6kSQw32lxxlVrn0D9pnrxx4HO2o',
  '5-1|2|teacher|cb': '125bOX2VcYAY8oUAH5MMrSAX6MVI0HtdFZcmzkOTI5W8',
  '5-1|2|teacher|deepDive': '1rEhUpzS6bgyGU5cwxT81yp63K2W9pNLiK5MsMu1hOT8',
  '5-2|1|student|cb': '1IEyXmlWC4UavI5PjfyJb1twA3hLhzNDRnHPfO4sefr4',
  '5-2|1|student|deepDive': '1FrpfS0Z04Kj1mWH0lKFrX4HGg0K3CdgPwg3BP-zIMAI',
  '5-2|1|teacher|cb': '18lBsuNu2-NF1cIgEYmxz_oQOBqEJdAbcHxkMsa4sRNk',
  '5-2|1|teacher|deepDive': '1IYO0Jdn_GKqSCKaun1orFtMZe8T-j6CWlvGxlTsXf-s',
  '5-3|1|student|cb': '116sv447IvTaF5Ji13U4rVXedN59-CyPPJki7VjtN8v0',
  '5-3|1|student|deepDive': '1aWe-M5-gcqtWeInONeI9yllLmIV0HvG4Y85_gCFHPE4',
  '5-3|1|teacher|cb': '1sSfuY1Kt5GFofRbDuUzsF0w1bg7AmjBkDQm54mhae1Y',
  '5-3|1|teacher|deepDive': '1JsmWzZOPc81NvNgxP9AV7oSLVS4nKJiwSnLa1Bl-gP4',
  '5-4|1|student|cb': '1RbQHvu8WR8U_av1fwKMesOtkz85HhwwsMf1qs0XtYAU',
  '5-4|1|student|deepDive': '1c8RiLgdn2DmIHfRR7qEe87qs4nEU7wgOBL_-1J7u6lY',
  '5-4|1|teacher|cb': '1kSDzCHHW63hAF0miyv0astRXtBDbhTJ2tgyY4N2Hfbs',
  '5-4|1|teacher|deepDive': '1hxO3p5KvaHyc77SXRHVldpg0y8kTo_zX-KVYNvXf-ZQ',
  '5-5|1|student|cb': '1FRbM3EUMoPoI9R8n-ngRjZJOwewMwKIDEUn4V800laE',
  '5-5|1|student|deepDive': '1MfoJqeEO8HBrbs6YSL_djQGI48fnh7NbEbGJPo-1jV4',
  '5-5|1|teacher|cb': '1CVSt9pIAXIb_rX2LYrBygAne8sls7DRCh-zDz2M13bs',
  '5-5|1|teacher|deepDive': '1H1lsHS4atmsLRMehNigv5Dt3vJkdnGPHrf2oJQ09Fwg',
  '5-6|1|student|cb': '1nkWbBhJ4zxc-txFwPCMn66d-SIwFpwFRd249umgYjuM',
  '5-6|1|student|deepDive': '1B9CRfVxTTQdlysklZdXDVYlken4Cu0NbQjLghgDiVbo',
  '5-6|1|teacher|cb': '1WchpUKNP1Nvh3Zf7lEt3coz_-355pOsvkq_Mz1gezTQ',
  '5-6|1|teacher|deepDive': '1aM0OVuBj71gZ2uUPI4tlfpcQ6h783XNpRWwECTEqFRc',
  '5-6|2|student|cb': '1s6eWMr_MxhMDJM0TnU-VnrZfJf3CcwhIwY0Xdbu2e4E',
  '5-6|2|student|deepDive': '1Lh3EtXWYyZYXHQ18fpdPtbs8jsk8jGvqn40MCB8n5bU',
  '5-6|2|teacher|cb': '1uRJBZRoWDFAn6qb2kp3B-SMpQ_knjYWCGKzcezQgIN4',
  '5-6|2|teacher|deepDive': '110Hs-74qHy793cZ0j2sYGyf6nFKZmNObDndlg4VyB0U',
};

// Set by the generator so a stale map is diagnosable from the file alone.
const GENERATED_AT = '2026-08-24';

function slideId(lessonId, day, variant, track) {
  const key = `${lessonId}|${day}|${variant}|${track}`;
  return Object.prototype.hasOwnProperty.call(SLIDE_IDS, key) ? SLIDE_IDS[key] : null;
}

// The embed parameters live here and nowhere else.
//
// This deliberately does NOT pass rm=minimal, which an earlier version did.
// rm=minimal hides the Slides embed toolbar, which looks tidier but is where
// the previous/next controls, the slide counter and the fullscreen button
// live. A teacher projecting a deck in class needs all three far more than
// they need the frame to blend into the page, so the toolbar stays.
//
// autoplay stays off: 35 lesson pages should not each start advancing slides
// on their own.
function embedUrl(id) {
  return `https://docs.google.com/presentation/d/${id}/embed?start=false&loop=false`;
}

function count() {
  return Object.keys(SLIDE_IDS).length;
}

module.exports = { slideId, embedUrl, count, GENERATED_AT };
