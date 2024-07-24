const fs = require("fs");
const { createErrorResponse, errorMessages } = require("../utils");
const { prisma } = require("../prisma/prisma-client");
const jdenticon = require("jdenticon");
const bcrypt = require("bcrypt");
const path = require("path");

const jwt = require("jsonwebtoken");

const UserController = {
  register: async (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return createErrorResponse(res, 400, errorMessages.emptyFields);
    }

    try {
      const isUserExisting = await prisma.user.findUnique({ where: { email } });
      if (isUserExisting) {
        return createErrorResponse(res, 400, errorMessages.userExist);
      }
      const generatedAvatar = jdenticon.toPng(`${name}${Date.now()}`, 200);
      const hashedPassed = await bcrypt.hash(password, 10);
      const avatarName = `${name}_${Date.now()}.png`;
      const avatarPath = path.join(__dirname, "/../uploads", avatarName);
      fs.writeFileSync(avatarPath, generatedAvatar);

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassed,
          name,
          avatarUrl: `/uploads/${avatarName}`,
        },
      });

      res.status(200).json({ user });
    } catch (error) {
      console.error({ error: `Error in registration: ${error.message}` });
      createErrorResponse(res, 500, errorMessages.requestCrashed);
    }
  },
  login: async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return createErrorResponse(res, 400, errorMessages.emptyFields);
    }
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return createErrorResponse(res, 401, errorMessages.loginError);
      }
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return createErrorResponse(res, 401, errorMessages.loginError);
      }
      const token = jwt.sign({ userId: user.id }, process.env.SECRET_KEY);
      res.status(200).json({ token });
    } catch (error) {
      console.error({ error: `Error in login: ${error.message}` });
      createErrorResponse(res, 500, errorMessages.requestCrashed);
    }
  },
  current: async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: {
          id: req.user.userId,
        },
        include: {
          followers: { include: { follower: true } },
          following: { include: { following: true } },
        },
      });

      if (!user) {
        return createErrorResponse(res, 404, errorMessages.notFound("User"));
      }
      res.status(200).json(user);
    } catch (error) {
      console.error(`Error in get current user ${error.message}`);
      createErrorResponse(res, 500, errorMessages.requestCrashed);
    }
  },
  getUserById: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        include: { followers: true, following: true },
      });
      if (!user) {
        return createErrorResponse(res, 404, errorMessages.notFound("User"));
      }

      const isFollowing = await prisma.follows.findFirst({
        where: { AND: [{ followerId: userId, followingId: id }] },
      });
      res.status(200).json({ ...user, isFollowing: Boolean(isFollowing) });
    } catch (error) {
      console.error(`Error with getUserById: ${error.message}`);
      createErrorResponse(res, 500, errorMessages.requestCrashed);
    }
  },
  updateUser: async (req, res) => {
    const { id } = req.params;
    const { email, bio, name, dateOfBirth, location } = req.body;
    let filePath;
    if (req.file && req.file.path) {
      filePath = req.file.path;
    }
    if (id !== req.user.userId) {
      return createErrorResponse(res, 403, errorMessages.noAccess);
    }

    try {
      if (email) {
        const existingUser = await prisma.user.findFirst({
          where: { email },
        });
        if (existingUser && existingUser.id !== id) {
          return createErrorResponse(res, 400, errorMessages.usedEmail);
        }
      }
      const user = await prisma.user.update({
        where: { id },
        data: {
          email: email || undefined,
          name: name || undefined,
          bio: bio || undefined,
          dateOfBirth: dateOfBirth || undefined,
          location: location || undefined,
        },
      });
      res.status(200).json(user);
    } catch (error) {
      console.error(`Error in update user: ${error.message}`);
      createErrorResponse(res, 500, errorMessages.requestCrashed);
    }
  },
};

module.exports = UserController;
