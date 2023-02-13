import app, { init } from "@/app";
import { prisma } from "@/config";
import faker from "@faker-js/faker";
import { TicketStatus } from "@prisma/client";
import httpStatus from "http-status";
import * as jwt from "jsonwebtoken";
import supertest from "supertest";
import { createBooking, createEnrollmentWithAddress, createHotel, createPayment, createRoomWithHotelId, createTicket, createTicketTypeRemote, createTicketTypeWithHotel, createUser } from "../factories";
import { cleanDb, generateValidToken } from "../helpers";

beforeAll(async () => {
  await init();
});

beforeEach(async () => {
  await cleanDb();
});

const server = supertest(app);

describe("GET /booking", () => {
  describe("when token is not valid", () => {
    it("should respond with status 401 if no token is given", async () => {
      const response = await server.get("/booking");
  
      expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });
  
    it("should respond with status 401 if given token is not valid", async () => {
      const token = faker.lorem.word();
  
      const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);
  
      expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });
  
    it("should respond with status 401 if there is no session for given token", async () => {
      const userWithoutSession = await createUser();
      const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);
  
      const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);
  
      expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });
  });

  describe("when token is valid", () => {
    it("should respond with status 404 when booking is not found", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);

      const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.NOT_FOUND);
    });

    it("should respond with status 200 and booking data", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdBooking = await createBooking(user.id, createdRoom.id);

      const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.OK);

      expect(response.body).toEqual(
        {
          id: createdBooking.id,
          Room: {
            id: createdRoom.id,
            name: createdRoom.name,
            capacity: createdRoom.capacity,
            hotelId: createdRoom.hotelId,
            createdAt: createdRoom.createdAt.toISOString(),
            updatedAt: createdRoom.updatedAt.toISOString()
          }
        }
      );
    });
  });
});

describe("POST /booking", () => {
  describe("when token is not valid", () => {
    it("should respond with status 401 if no token is given", async () => {
      const response = await server.post("/booking").send({ roomId: 1 });
  
      expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });
  
    it("should respond with status 401 if given token is not valid", async () => {
      const token = faker.lorem.word();
  
      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: 1 });
  
      expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });
  
    it("should respond with status 401 if there is no session for given token", async () => {
      const userWithoutSession = await createUser();
      const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);
  
      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: 1 });
  
      expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });
  });

  describe("when body is not valid is not valid", () => {
    it("should respond with status 400 when body is empty", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({});

      expect(response.status).toEqual(httpStatus.BAD_REQUEST);
    });

    it("should respond with status 400 when roomId is a string", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: "Hello World" });

      expect(response.status).toEqual(httpStatus.BAD_REQUEST);
    });

    it("should respond with status 400 when roomId is less than 1", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: 0 });

      expect(response.status).toEqual(httpStatus.BAD_REQUEST);
    });
  });

  describe("when user ticket isn't valid", () => {
    it("should respond with status 404 when user has no enrollment", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: 1 });

      expect(response.status).toEqual(httpStatus.NOT_FOUND);
    });

    it("should respond with status 403 when user has no ticket", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      await createEnrollmentWithAddress(user);

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: 1 });

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 when user ticket isn't PAID", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: 1 });

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 when user ticket is remote", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeRemote();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      await createPayment(ticket.id, ticketType.price);

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: 1 });

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });
  });

  describe("when booking isn't allowed", () => {
    it("should respond with status 404 when roomId doesn't exist", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      await createPayment(ticket.id, ticketType.price);

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: 1000 });

      expect(response.status).toEqual(httpStatus.NOT_FOUND);
    });

    it("should respond with status 403 when user is already booked", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      await createPayment(ticket.id, ticketType.price);

      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      await createBooking(user.id, createdRoom.id);

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: createdRoom.id });

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 when given room has no space", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);

      for(let i=0; i<createdRoom.capacity; i++) {
        const client = await createUser();
        await createBooking(client.id, createdRoom.id);
      }

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: createdRoom.id });

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });
  });
  
  describe("when user has a paid ticket, and gave a valid and available room", () => {
    it("should respond with status 200 and bookingId when booking is done", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);

      const bookingCountBefore = await prisma.booking.count();
      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: createdRoom.id });

      const bookingCountAfter = await prisma.booking.count();

      expect(response.status).toEqual(httpStatus.OK);
      expect(response.body).toEqual(
        {
          bookingId: expect.any(Number)
        }
      );
      expect(bookingCountBefore).toBe(0);
      expect(bookingCountAfter).toBe(1);
    });
  });
});

describe("PUT /booking", () => {
  describe("when token is not valid", () => {
    it("should respond with status 401 if no token is given", async () => {
      const response = await server.put("/booking/1").send({ roomId: 1 });
  
      expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });
  
    it("should respond with status 401 if given token is not valid", async () => {
      const token = faker.lorem.word();
  
      const response = await server.put("/booking/1").set("Authorization", `Bearer ${token}`).send({ roomId: 1 });
  
      expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });
  
    it("should respond with status 401 if there is no session for given token", async () => {
      const userWithoutSession = await createUser();
      const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);
  
      const response = await server.put("/booking/1").set("Authorization", `Bearer ${token}`).send({ roomId: 1 });
  
      expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });
  });

  describe("when body roomId isn't valid", () => {
    it("should respond with status 400 when body is empty", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);

      const response = await server.put("/booking/1").set("Authorization", `Bearer ${token}`).send({});

      expect(response.status).toEqual(httpStatus.BAD_REQUEST);
    });

    it("should respond with status 400 when roomId is a string", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);

      const response = await server.put("/booking/1").set("Authorization", `Bearer ${token}`).send({ roomId: "hello world" });

      expect(response.status).toEqual(httpStatus.BAD_REQUEST);
    });

    it("should respond with status 400 when roomId is lesser than 1", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);

      const response = await server.put("/booking/1").set("Authorization", `Bearer ${token}`).send({ roomId: 0 });

      expect(response.status).toEqual(httpStatus.BAD_REQUEST);
    });
  });

  describe("when bookingId isn't valid", () => {
    it("should respond with status 400 when route param bookingId is a string", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);

      const response = await server.put("/booking/helloworld").set("Authorization", `Bearer ${token}`).send({ roomId: 1 });

      expect(response.status).toEqual(httpStatus.BAD_REQUEST);
    });

    it("should respond with status 400 when route param bookingId is less than 1", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);

      const response = await server.put("/booking/0").set("Authorization", `Bearer ${token}`).send({ roomId: 1 });

      expect(response.status).toEqual(httpStatus.BAD_REQUEST);
    });
  });

  describe("when user ticket isn't valid", () => {
    it("should respond with status 404 when user has no enrollment", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);

      await createTicketTypeRemote();

      const response = await server.put("/booking/1").set("Authorization", `Bearer ${token}`).send({ roomId: 1 });

      expect(response.status).toEqual(httpStatus.NOT_FOUND);
    });

    it("should respond with status 403 when user has no ticket", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      await createEnrollmentWithAddress(user);

      const response = await server.put("/booking/1").set("Authorization", `Bearer ${token}`).send({ roomId: 1 });

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 when user ticket is remote", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeRemote();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      await createPayment(ticket.id, ticketType.price);

      const response = await server.put("/booking/1").set("Authorization", `Bearer ${token}`).send({ roomId: 1 });

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 when user ticket isn't PAID", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);

      const response = await server.put("/booking/1").set("Authorization", `Bearer ${token}`).send({ roomId: 1 });

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });
  });

  describe("when booking is not allowed", () => {
    it("should respond with status 404 when roomId doesn't exist", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      await createPayment(ticket.id, ticketType.price);

      const response = await server.put("/booking/1").set("Authorization", `Bearer ${token}`).send({ roomId: 1 });

      expect(response.status).toEqual(httpStatus.NOT_FOUND);
    });

    it("should respond with status 403 when given room has no space", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      await createPayment(ticket.id, ticketType.price);

      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      for(let i=0; i<createdRoom.capacity; i++) {
        const guest = await createUser();
        await createBooking(guest.id, createdRoom.id);
      }

      const response = await server.put("/booking/1").set("Authorization", `Bearer ${token}`).send({ roomId: createdRoom.id });

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 when given roomId is already booked by the user", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      await createPayment(ticket.id, ticketType.price);

      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdBooking = await createBooking(user.id, createdRoom.id);

      const response = await server.put(`/booking/${createdBooking.id}`).set("Authorization", `Bearer ${token}`).send({ roomId: createdRoom.id });

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 when user doesn't have a booking", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      await createPayment(ticket.id, ticketType.price);

      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);

      const response = await server.put("/booking/1").set("Authorization", `Bearer ${token}`).send({ roomId: createdRoom.id });

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 when given bookingId isn't actual from user", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      await createPayment(ticket.id, ticketType.price);

      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      await createBooking(user.id, createdRoom.id);

      const guest = await createUser();
      const differentBooking = await createBooking(guest.id, createdRoom.id);

      const response = await server.put(`/booking/${differentBooking.id}`).set("Authorization", `Bearer ${token}`).send({ roomId: createdRoom.id });

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });
  });

  describe("when user has a paid ticket, and gave a valid and available room", () => {
    it("should respond with status 200 and bookingId when booking is updated", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdBooking = await createBooking(user.id, createdRoom.id);
      
      const room = await createRoomWithHotelId(createdHotel.id);

      const bookingCountBefore = await prisma.booking.count();
      const response = await server.put(`/booking/${createdBooking.id}`).set("Authorization", `Bearer ${token}`).send({ roomId: room.id });
      const updatedBooking = await prisma.booking.findUnique({ 
        where: {
          id: createdBooking.id
        }
      });
      const bookingCountAfter = await prisma.booking.count();

      expect(response.status).toEqual(httpStatus.OK);
      expect(createdBooking.createdAt.toISOString()).toMatch(updatedBooking.createdAt.toISOString());
      expect(createdBooking.updatedAt.toISOString()).not.toMatch(updatedBooking.updatedAt.toISOString());
      expect(response.body).toEqual(
        {
          bookingId: expect.any(Number)
        }
      );
      expect(bookingCountBefore).toEqual(bookingCountAfter);
    });
  });
});
