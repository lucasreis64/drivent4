import { notFoundError } from "@/errors";
import ticketRepository from "@/repositories/ticket-repository";
import enrollmentRepository from "@/repositories/enrollment-repository";
import bookingRepository from "@/repositories/booking-repository";

async function validateEnrollment(userId: number) {
  const enrollment = await enrollmentRepository.findWithAddressByUserId(userId);

  if (!enrollment) {
    throw notFoundError();
  }

  return enrollment.id;
}

async function validateTicketAndRoom(enrollmentId: number, roomId: number) {
  const ticket = await ticketRepository.findTicketByEnrollmentId(enrollmentId);

  if (!ticket) 
    throw notFoundError();

  if (ticket.status !== "PAID" || !ticket.TicketType.includesHotel || ticket.TicketType.isRemote)
    throw 403;

  const room = bookingRepository.findRoom(roomId);

  if (!room) 
    throw notFoundError;
}

async function getBooking(userId: number) {
  await validateEnrollment(userId);

  const booking = await bookingRepository.findBooking(userId);

  if (!booking) {
    throw notFoundError();
  }

  return booking;
}

async function createBooking(userId: number, roomId: number) {
  const enrollmentId = await validateEnrollment(userId);

  await validateTicketAndRoom(enrollmentId, roomId);
  
  const data = {
    userId,
    roomId,
  };

  const booking = await bookingRepository.upsertBooking(0, data);
}

const ticketService = {
  getBooking,
  createBooking
};

export default ticketService;
