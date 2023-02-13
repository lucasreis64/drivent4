import { AuthenticatedRequest } from "@/middlewares";
import bookingService from "@/services/booking-service";
import { Response } from "express";
import httpStatus from "http-status";

export async function getBooking(req: AuthenticatedRequest, res: Response) {
  const { userId } = req;

  try {
    const booking = await bookingService.getBooking(userId);

    return res.status(httpStatus.OK).send(booking);
  } catch (error) {
    if (error.name === "NotFoundError") {
      return res.sendStatus(httpStatus.NOT_FOUND);
    } else if (error === 403) {
      return res.sendStatus(httpStatus.FORBIDDEN);
    }
  }
}

export async function createBooking(req: AuthenticatedRequest, res: Response) {
  const { userId } = req;

  const { roomId } = req.body;

  try {
    const bookingId = await bookingService.createBooking(userId, roomId);

    return res.status(httpStatus.OK).send({ bookingId: bookingId });
  } catch (error) {
    if (error === 403) {
      return res.sendStatus(httpStatus.FORBIDDEN);
    }
    return res.sendStatus(httpStatus.NOT_FOUND);
  }
}

export async function updateBooking(req: AuthenticatedRequest, res: Response) {
  const { userId } = req;

  const { roomId } = req.body;

  const { bookingId } = req.params;

  try {
    const newBookingId = await bookingService.updateBooking(userId, roomId, Number(bookingId));

    return res.status(httpStatus.OK).send({ bookingId: newBookingId });
  } catch (error) {
    if (error === 403) {
      return res.sendStatus(httpStatus.FORBIDDEN);
    }
    return res.sendStatus(httpStatus.NOT_FOUND);
  }
}
