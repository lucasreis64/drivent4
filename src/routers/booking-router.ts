import { Router } from "express";
import { authenticateToken, validateBody, validateParams } from "@/middlewares";
import { createBooking, getBooking, updateBooking } from "@/controllers";
import { bookingParamsSchema, postBookingSchema } from "@/schemas/booking-schemas";

const bookingRouter = Router();

bookingRouter
  .all("/*", authenticateToken)
  .get("", getBooking)
  .post("", validateBody(postBookingSchema), createBooking)
  .put("/:bookingId", validateParams(bookingParamsSchema), validateBody(postBookingSchema), updateBooking);

export { bookingRouter };
