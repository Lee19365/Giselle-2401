
import { Router } from "express";
import { createPayment } from "./snailpay.controller";

export const snailpayRouter = Router();

snailpayRouter.post("/payments", createPayment);