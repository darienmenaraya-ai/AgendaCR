export type PaymentStatus = "reported" | "verified" | "rejected";

export type PaymentRecord = {
  id: string;
  appointmentId: string;
  amountCrc: number;
  reference: string;
  status: PaymentStatus;
  reviewNote: string | null;
  createdAt: Date;
};

export type BusinessPaymentRecord = PaymentRecord & {
  reporterName: string;
};
