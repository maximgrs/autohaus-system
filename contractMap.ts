// contractMap.ts
export type ConditionArea = "A" | "B" | "C" | "D" | "E";
export type ConditionClass = 1 | 2 | 3 | 4;
export type PaymentMethod = "BAR" | "KREDIT" | "UEBERWEISUNG" | "LEASING";

export const PDF_MAP = {
  sellerName: "Text3",
  buyerEmail: "Text4",
  buyerPhone: "Text8",
  buyerBirthDate: "Text9",

  carFirstRegistration: "Text10",
  carColor: "Text11",

  buyerNameOrCompany: "Text13",
  buyerAddress: "Text14",

  carMake: "Text15",
  carModel: "Text16",
  carVin: "Text18",
  carEngineNumber: "Text19",
  carMileageAtContract: "Text20",

  totalPrice: "Text49",
  downPayment: "Text50",
  otherAgreements: "Text51",

  remainingAmountFrom: "Text53",
  installmentsSplit: "Text55",
  installmentsDueUntil: "Text56",

  vehicleConditionNumber: "Text58",

  footerPlaceTop: "Text59",
  footerDateTop: "Text60",
  footerSellerSignature: "Text61",
  footerBuyerSignature: "Text62",

  footerPlaceBottom: "Text64",
  footerDateBottom: "Text65",
  footerBuyerSignatureBottom: "Text63",
} as const;

export const PDF_BUTTONS = {
  condition: {
    A: { 1: "COND_A_1", 2: "COND_A_2", 3: "COND_A_3", 4: "COND_A_4" },
    B: { 1: "COND_B_1", 2: "COND_B_2", 3: "COND_B_3", 4: "COND_B_4" },
    C: { 1: "COND_C_1", 2: "COND_C_2", 3: "COND_C_3", 4: "COND_C_4" },
    D: { 1: "COND_D_1", 2: "COND_D_2", 3: "COND_D_3", 4: "COND_D_4" },
    E: { 1: "COND_E_1", 2: "COND_E_2", 3: "COND_E_3", 4: "COND_E_4" },
  } as const,

  payment: {
    BAR: "PAY_BAR",
    KREDIT: "PAY_KREDIT",
    UEBERWEISUNG: "PAY_UEBERWEISUNG",
    LEASING: "PAY_LEASING",
  } as const,
} as const;

export function getConditionButton(area: ConditionArea, cls: ConditionClass) {
  return PDF_BUTTONS.condition[area][cls];
}

export function getPaymentButton(method: PaymentMethod) {
  return PDF_BUTTONS.payment[method];
}
