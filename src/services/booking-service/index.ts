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

async function validateRoom(roomId: number) {
  const room = await bookingRepository.findRoom(roomId);

  if (!room) {
    throw 404;
  }
  if(room.Booking.length >= room.capacity)
    throw 403;
}

async function validateTicket(enrollmentId: number) {
  const ticket = await ticketRepository.findTicketByEnrollmentId(enrollmentId);

  if (!ticket) 
    throw 403;

  if (ticket.status !== "PAID" || !ticket.TicketType.includesHotel || ticket.TicketType.isRemote)
    throw 403;
}

async function getBooking(userId: number) {
  const booking = await bookingRepository.findBooking(userId);

  if (!booking) {
    throw notFoundError();
  }

  return booking;
}

async function createBooking(userId: number, roomId: number) {
  const enrollmentId = await validateEnrollment(userId);

  await validateTicket(enrollmentId);

  await validateRoom(roomId);

  const booking = await bookingRepository.findBooking(userId);

  if(booking) 
    throw 403;
  
  const data = {
    userId,
    roomId,
  };

  const bookingId = await bookingRepository.upsertBooking(0, data);

  return bookingId.id;
}

async function updateBooking(userId: number, roomId: number, bookingId: number) {
  const enrollmentId = await validateEnrollment(userId);

  await validateTicket(enrollmentId);

  await validateRoom(roomId);

  const booking = await bookingRepository.findBooking(userId);

  if(!booking || booking.id !== bookingId)
    throw 403;

  if(booking.Room.id === roomId)
    throw 403;
  
  const data = {
    userId,
    roomId,
  };

  const newBookingId = await bookingRepository.upsertBooking(bookingId, data);

  return newBookingId.id;
}

const bookingService = {
  getBooking,
  createBooking,
  updateBooking
};

export default bookingService;
