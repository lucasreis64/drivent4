
import { bookingParams } from "@/repositories/booking-repository";
import Joi from "joi";

export const postBookingSchema = Joi.object<Pick<bookingParams, "roomId">>({
  roomId: Joi.number().min(1).required()
});

export const bookingParamsSchema = Joi.object<{ bookingId: number }>({
  bookingId: Joi.number().min(1).required()
});
