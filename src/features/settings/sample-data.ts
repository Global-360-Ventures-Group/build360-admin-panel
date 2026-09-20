/**
 * The settings fixture.
 *
 * Only the three sections the API cannot store — store profile, tax and
 * payments. Account and appearance read real state and are not in here; see
 * the note at the top of `./types` for why this screen is only half a fixture.
 *
 * The store details match the brand the sidebar and the login screen already
 * show, and the payment list is the API's real `paymentMethod` enum in the
 * order the orders fixture actually uses them — so nothing here contradicts a
 * screen that is live.
 */

import type { SettingsFixture } from "./types";

export const SAMPLE_SETTINGS: SettingsFixture = {
  store: {
    name: "Build360",
    legalName: "Global 360 Ventures Ltd.",
    tradeLicence: "TRAD/DSCC/041982/2024",
    binNumber: "004182716-0201",
    supportEmail: "support@build360.com.bd",
    supportPhone: "09610-360360",
    addressLine1: "Level 7, Concord Tower, 113 Kazi Nazrul Islam Avenue",
    district: "Dhaka",
    division: "Dhaka",
    postalCode: "1215",
  },
  tax: {
    currency: "BDT",
    vatRate: 7.5,
    pricesIncludeVat: false,
    vatRegistration: "004182716-0201",
  },
  payments: [
    {
      method: "BANK_TRANSFER",
      enabled: true,
      note: "Trade accounts. Confirmed by the desk against the bank statement.",
    },
    {
      method: "BKASH",
      enabled: true,
      note: "Gateway checkout via /payments/initiate.",
    },
    {
      method: "NAGAD",
      enabled: true,
      note: "Gateway checkout via /payments/initiate.",
    },
    {
      method: "CARD",
      enabled: true,
      note: "Gateway checkout. Cards are never handled by this panel.",
    },
    {
      method: "COD",
      enabled: true,
      note: "Confirmed by the Order API, not the payment feature.",
    },
    {
      method: "ROCKET",
      enabled: false,
      // In the enum, absent from the fixture's orders — which is exactly what
      // "switched off" should look like.
      note: "In the API's enum but not offered at checkout.",
    },
  ],
};
