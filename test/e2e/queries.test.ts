import { Comment, PrismaClient, Profile, User } from "@prisma/client";
import faker from "faker";

import { createSoftDeleteExtension } from "../../src";
import client from "./client";

describe("queries", () => {
  let testClient: any;
  let profile: Profile;
  let firstUser: User;
  let secondUser: User;
  let deletedUser: User;
  let comment: Comment;

  beforeAll(async () => {
    testClient = new PrismaClient();
    testClient = testClient.$extends(
      createSoftDeleteExtension({ models: { User: true } })
    );

    profile = await client.profile.create({
      data: {
        bio: faker.lorem.sentence(),
      },
    });
    firstUser = await client.user.create({
      data: {
        email: faker.internet.email(),
        name: "Jack",
        profileId: profile.id,
      },
    });
    secondUser = await client.user.create({
      data: {
        email: faker.internet.email(),
        name: "John",
      },
    });
    deletedUser = await client.user.create({
      data: {
        email: faker.internet.email(),
        name: "Jill",
        deleted: true,
        profileId: profile.id,
      },
    });
    comment = await client.comment.create({
      data: {
        content: faker.lorem.sentence(),
        authorId: firstUser.id,
      },
    });
  });
  afterEach(async () => {
    await Promise.all([
      // reset starting data
      client.profile.update({ where: { id: profile.id }, data: profile }),
      client.user.update({ where: { id: deletedUser.id }, data: deletedUser }),
      client.user.update({ where: { id: firstUser.id }, data: firstUser }),
      client.user.update({ where: { id: secondUser.id }, data: secondUser }),
      client.comment.update({ where: { id: comment.id }, data: comment }),

      // delete created models
      client.profile.deleteMany({
        where: { id: { not: { in: [profile.id] } } },
      }),
      client.user.deleteMany({
        where: {
          id: { not: { in: [firstUser.id, secondUser.id, deletedUser.id] } },
        },
      }),
      client.comment.deleteMany({
        where: { id: { not: { in: [comment.id] } } },
      }),
    ]);
  });
  afterAll(async () => {
    await testClient.$disconnect();
    await client.user.deleteMany({ where: {} });
  });

  describe("delete", () => {
    it("delete soft deletes", async () => {
      const result = await testClient.user.delete({
        where: { id: firstUser.id },
      });
      expect(result).not.toBeNull();

      const dbUser = await client.user.findUnique({
        where: { id: firstUser.id },
      });
      expect(dbUser).not.toBeNull();
      expect(dbUser!.id).toEqual(firstUser.id);
      expect(dbUser?.deleted).toBe(true);
    });

    it("nested delete soft deletes", async () => {
      const result = await testClient.profile.update({
        where: { id: profile.id },
        data: {
          users: {
            delete: {
              id: firstUser.id,
            },
          },
        },
      });
      expect(result).not.toBeNull();

      const dbUser = await client.user.findUniqueOrThrow({
        where: { id: firstUser.id },
      });
      expect(dbUser.deleted).toBe(true);
    });
  });

  describe("deleteMany", () => {
    it("deleteMany soft deletes", async () => {
      const result = await testClient.user.deleteMany({
        where: { name: { contains: "J" } },
      });
      expect(result).not.toBeNull();
      expect(result.count).toEqual(2);

      const dbUsers = await client.user.findMany({
        where: { name: { contains: "J" } },
      });
      expect(dbUsers).toHaveLength(3);
      expect(dbUsers.map(({ id }) => id).sort()).toEqual(
        [firstUser.id, secondUser.id, deletedUser.id].sort()
      );
      expect(dbUsers.every(({ deleted }) => deleted)).toBe(true);
    });

    it("nested deleteMany soft deletes", async () => {
      const result = await testClient.profile.update({
        where: { id: profile.id },
        data: {
          users: {
            deleteMany: {
              name: { contains: "J" },
            },
          },
        },
      });
      expect(result).not.toBeNull();

      const dbUsers = await client.user.findMany({
        where: { name: { contains: "J" }, deleted: true },
      });
      expect(dbUsers).toHaveLength(2);
      expect(dbUsers.map(({ id }) => id).sort()).toEqual(
        [firstUser.id, deletedUser.id].sort()
      );
    });
  });

  describe("updateMany", () => {
    it("updateMany excludes soft deleted records", async () => {
      const result = await testClient.user.updateMany({
        where: { name: { contains: "J" } },
        data: { name: "Updated" },
      });
      expect(result).not.toBeNull();
      expect(result.count).toEqual(2);

      const updatedDbUsers = await client.user.findMany({
        where: { name: { contains: "Updated" } },
      });
      expect(updatedDbUsers).toHaveLength(2);
      expect(updatedDbUsers.map(({ id }) => id).sort()).toEqual(
        [firstUser.id, secondUser.id].sort()
      );
      expect(updatedDbUsers.every(({ deleted }) => !deleted)).toBe(true);
      expect(updatedDbUsers.every(({ name }) => name === "Updated")).toBe(true);

      const deletedDbUser = await client.user.findUniqueOrThrow({
        where: { id: deletedUser.id },
      });
      expect(deletedDbUser.name).toEqual(deletedUser.name);
    });

    it("nested updateMany excludes soft deleted records", async () => {
      const result = await testClient.profile.update({
        where: { id: profile.id },
        data: {
          users: {
            updateMany: {
              where: { name: { contains: "J" } },
              data: { name: "Updated" },
            },
          },
        },
      });
      expect(result).not.toBeNull();

      const dbUpdatedUser = await client.user.findUniqueOrThrow({
        where: { id: firstUser.id },
      });
      expect(dbUpdatedUser.name).toEqual("Updated");

      const dbDeletedUser = await client.user.findUniqueOrThrow({
        where: { id: deletedUser.id },
      });
      expect(dbDeletedUser.name).toEqual(deletedUser.name);
    });
  });

  describe("update", () => {
    it("update does not exclude soft deleted records", async () => {
      const result = await testClient.user.update({
        where: { id: deletedUser.id },
        data: { name: "Updated Jill" },
      });
      expect(result).not.toBeNull();
      expect(result.name).toEqual("Updated Jill");

      const dbUser = await client.user.findUniqueOrThrow({
        where: { id: deletedUser.id },
      });
      expect(dbUser.name).toEqual("Updated Jill");
    });

    it("nested toMany update does not exclude soft deleted records", async () => {
      const result = await testClient.user.update({
        where: { id: firstUser.id },
        data: {
          comments: {
            updateMany: {
              where: { id: comment.id },
              data: { content: "Updated" },
            },
          },
        },
      });
      expect(result).not.toBeNull();

      const dbComment = await client.comment.findUniqueOrThrow({
        where: { id: comment.id },
      });
      expect(dbComment.content).toEqual("Updated");
    });

    it("nested toOne update throws by default", async () => {
      await expect(
        testClient.comment.update({
          where: { id: comment.id },
          data: {
            author: {
              update: {
                name: "Updated",
              },
            },
          },
        })
      ).rejects.toThrowError(
        `prisma-extension-soft-delete: update of model "User" through "Comment.author" found. Updates of soft deleted models through a toOne relation is not supported as it is possible to update a soft deleted record.`
      );
    });
  });

  describe("upsert", () => {
    it("upsert does not exclude soft deleted records", async () => {
      const result = await testClient.user.upsert({
        where: { id: deletedUser.id },
        create: { email: faker.internet.email(), name: "New User" },
        update: { name: "Updated" },
      });
      expect(result).not.toBeNull();
      expect(result.name).toEqual("Updated");

      const dbUser = await client.user.findUniqueOrThrow({
        where: { id: deletedUser.id },
      });
      expect(dbUser.name).toEqual("Updated");
    });

    it("nested toMany upsert does not exclude soft deleted records", async () => {
      const result = await testClient.profile.update({
        where: { id: profile.id },
        data: {
          users: {
            upsert: {
              where: { id: deletedUser.id },
              create: { email: faker.internet.email(), name: "New User" },
              update: { name: "Updated" },
            },
          },
        },
      });
      expect(result).not.toBeNull();

      const dbUser = await client.user.findUniqueOrThrow({
        where: { id: deletedUser.id },
      });
      expect(dbUser.name).toEqual("Updated");
    });

    it("nested toOne upsert throws by default", async () => {
      await expect(
        testClient.comment.update({
          where: { id: comment.id },
          data: {
            author: {
              upsert: {
                create: { email: faker.internet.email(), name: "New User" },
                update: { name: "Updated" },
              },
            },
          },
        })
      ).rejects.toThrowError(
        `prisma-extension-soft-delete: upsert of model "User" through "Comment.author" found. Upserts of soft deleted models through a toOne relation is not supported as it is possible to update a soft deleted record.`
      );
    });
  });

  describe("findFirst", () => {
    it("findFirst excludes soft deleted records", async () => {
      const foundUser = await testClient.user.findFirst({
        where: { email: firstUser.email },
      });

      expect(foundUser).not.toBeNull();
      expect(foundUser!.id).toEqual(firstUser.id);

      const notFoundUser = await testClient.user.findFirst({
        where: { email: deletedUser.email },
      });
      expect(notFoundUser).toBeNull();
    });
  });

  describe("findFirstOrThrow", () => {
    it("findFirstOrThrow throws for soft deleted records", async () => {
      const foundUser = await testClient.user.findFirstOrThrow({
        where: { email: firstUser.email },
      });

      expect(foundUser).not.toBeNull();
      expect(foundUser!.id).toEqual(firstUser.id);

      await expect(() =>
        testClient.user.findFirstOrThrow({
          where: { email: deletedUser.email },
        })
      ).rejects.toThrowError("No User found");
    });
  });

  describe("findUnique", () => {
    it("findUnique excludes soft deleted records", async () => {
      const foundUser = await testClient.user.findUnique({
        where: { id: firstUser.id },
      });
      expect(foundUser).not.toBeNull();
      expect(foundUser!.id).toEqual(firstUser.id);

      const notFoundUser = await testClient.user.findUnique({
        where: { id: deletedUser.id },
      });
      expect(notFoundUser).toBeNull();
    });

    it("throws a useful error when invalid where is passed", async () => {
      // throws useful error when no where is passed
      await expect(() => testClient.user.findUnique()).rejects.toThrowError(
        "Invalid `testClient.user.findUnique()` invocation"
      );

      // throws useful error when empty where is passed
      await expect(() => testClient.user.findUnique({})).rejects.toThrowError(
        "Invalid `testClient.user.findUnique()` invocation"
      );

      // throws useful error when where is passed undefined unique fields
      await expect(() =>
        testClient.user.findUnique({
          where: { id: undefined },
        })
      ).rejects.toThrowError(
        "Invalid `testClient.user.findUnique()` invocation"
      );

      // throws useful error when where has defined non-unique fields
      await expect(() =>
        testClient.user.findUnique({
          where: { name: firstUser.name },
        })
      ).rejects.toThrowError(
        "Invalid `testClient.user.findUnique()` invocation"
      );

      // throws useful error when where has undefined compound unique index field
      await expect(() =>
        testClient.user.findUnique({
          where: { name_email: undefined },
        })
      ).rejects.toThrowError(
        "Invalid `testClient.user.findUnique()` invocation"
      );

      // throws useful error when where has undefined unique field and defined non-unique field
      await expect(() =>
        testClient.user.findUnique({
          where: { id: undefined, name: firstUser.name },
        })
      ).rejects.toThrowError(
        "Invalid `testClient.user.findUnique()` invocation"
      );
    });

    // TODO:- enable this test when extendedWhereUnique is supported
    it.failing(
      "findUnique excludes soft-deleted records when using compound unique index fields",
      async () => {
        const notFoundUser = await testClient.user.findUnique({
          where: {
            name_email: {
              name: deletedUser.name,
              email: deletedUser.email,
            },
          },
        });
        expect(notFoundUser).toBeNull();
      }
    );
  });

  describe("findUniqueOrThrow", () => {
    it("findUniqueOrThrow throws for soft deleted records", async () => {
      const foundUser = await testClient.user.findUniqueOrThrow({
        where: { id: firstUser.id },
      });
      expect(foundUser).not.toBeNull();
      expect(foundUser!.id).toEqual(firstUser.id);

      await expect(() =>
        testClient.user.findUniqueOrThrow({
          where: { id: deletedUser.id },
        })
      ).rejects.toThrowError("No User found");
    });

    it("throws a useful error when invalid where is passed", async () => {
      // throws useful error when no where is passed
      await expect(() =>
        testClient.user.findUniqueOrThrow()
      ).rejects.toThrowError(
        "Invalid `testClient.user.findUniqueOrThrow()` invocation"
      );

      // throws useful error when empty where is passed
      await expect(() =>
        testClient.user.findUniqueOrThrow({})
      ).rejects.toThrowError(
        "Invalid `testClient.user.findUniqueOrThrow()` invocation"
      );

      // throws useful error when where is passed undefined unique fields
      await expect(() =>
        testClient.user.findUniqueOrThrow({
          where: { id: undefined },
        })
      ).rejects.toThrowError(
        "Invalid `testClient.user.findUniqueOrThrow()` invocation"
      );

      // throws useful error when where has defined non-unique fields
      await expect(() =>
        testClient.user.findUniqueOrThrow({
          where: { name: firstUser.name },
        })
      ).rejects.toThrowError(
        "Invalid `testClient.user.findUniqueOrThrow()` invocation"
      );

      // throws useful error when where has undefined compound unique index field
      await expect(() =>
        testClient.user.findUniqueOrThrow({
          where: { name_email: undefined },
        })
      ).rejects.toThrowError(
        "Invalid `testClient.user.findUniqueOrThrow()` invocation"
      );

      // throws useful error when where has undefined unique field and defined non-unique field
      await expect(() =>
        testClient.user.findUniqueOrThrow({
          where: { id: undefined, name: firstUser.name },
        })
      ).rejects.toThrowError(
        "Invalid `testClient.user.findUniqueOrThrow()` invocation"
      );
    });

    // TODO:- enable this test when extendedWhereUnique is supported
    it.failing(
      "findUniqueOrThrow excludes soft-deleted records when using compound unique index fields",
      async () => {
        const notFoundUser = await testClient.user.findUniqueOrThrow({
          where: {
            name_email: {
              name: deletedUser.name,
              email: deletedUser.email,
            },
          },
        });
        expect(notFoundUser).toBeNull();
      }
    );
  });

  describe("findMany", () => {
    it("findMany excludes soft deleted records", async () => {
      const foundUsers = await testClient.user.findMany({
        where: { name: { contains: "J" } },
      });
      expect(foundUsers).toHaveLength(2);
      expect(foundUsers.map(({ id }: any) => id).sort()).toEqual(
        [firstUser.id, secondUser.id].sort()
      );
    });
  });

  describe("count", () => {
    it("count excludes soft deleted records", async () => {
      const count = await testClient.user.count({
        where: { name: { contains: "J" } },
      });
      expect(count).toEqual(2);
    });
  });

  describe("aggregate", () => {
    it("aggregate excludes soft deleted records", async () => {
      const aggregate = await testClient.user.aggregate({
        where: { name: { contains: "J" } },
        _sum: {
          id: true,
        },
      });
      expect(aggregate._sum.id).toEqual(firstUser.id + secondUser.id);
    });
  });

  describe("create", () => {
    it("does not prevent creating a record", async () => {
      const result = await testClient.user.create({
        data: { email: faker.internet.email(), name: "New User" },
      });
      expect(result).not.toBeNull();
    });

    it("does not prevent creating a soft deleted record", async () => {
      const result = await testClient.user.create({
        data: {
          email: faker.internet.email(),
          name: "New User",
          deleted: true,
        },
      });
      expect(result).not.toBeNull();
    });

    it("does not prevent creating a nested record", async () => {
      const result = await testClient.profile.update({
        where: { id: profile.id },
        data: {
          users: {
            create: { email: faker.internet.email(), name: "New User" },
          },
        },
        include: {
          users: true,
        },
      });
      // should be first user and new user
      expect(result.users).toHaveLength(2);

      // first user should be there
      expect(
        result.users.find(({ id }: any) => id === firstUser.id)
      ).not.toBeNull();

      // other users should not be returned
      expect(
        result.users.find(({ id }: any) => id === secondUser.id)
      ).not.toBeDefined();
      expect(
        result.users.find(({ id }: any) => id === deletedUser.id)
      ).not.toBeDefined();
    });

    it("does not prevent creating a nested soft deleted record", async () => {
      const result = await testClient.profile.update({
        where: { id: profile.id },
        data: {
          users: {
            create: {
              email: faker.internet.email(),
              name: "New User",
              deleted: true,
            },
          },
        },
        include: {
          users: true,
        },
      });
      // should be first user and new user
      expect(result.users).toHaveLength(1);

      // only first user should be there
      expect(result.users[0].id).toEqual(firstUser.id);

      // user was created
      const dbUser = await client.user.findFirst({
        where: { name: "New User" },
      });
      expect(dbUser).not.toBeNull();
    });
  });

  describe("createMany", () => {
    it("createMany can create records and soft deleted records", async () => {
      const result = await testClient.user.createMany({
        data: [
          { email: faker.internet.email(), name: faker.name.findName() },
          {
            email: faker.internet.email(),
            name: faker.name.findName(),
            deleted: true,
          },
        ],
      });
      expect(result).not.toBeNull();
      expect(result.count).toEqual(2);
    });

    it("nested createMany can create records and soft deleted records", async () => {
      const result = await testClient.user.create({
        data: {
          email: faker.internet.email(),
          name: faker.name.findName(),
          comments: {
            createMany: {
              data: [
                { content: faker.lorem.sentence() },
                {
                  content: faker.lorem.sentence(),
                  deleted: true,
                },
              ],
            },
          },
        },
      });
      expect(result).not.toBeNull();

      const dbUser = await client.user.findUniqueOrThrow({
        where: { id: result.id },
        include: { comments: true },
      });
      expect(dbUser.comments).toHaveLength(2);
      expect(dbUser.comments.filter(({ deleted }) => deleted)).toHaveLength(1);
      expect(dbUser.comments.filter(({ deleted }) => !deleted)).toHaveLength(1);
    });
  });

  describe("connect", () => {
    it("connect connects soft deleted records", async () => {
      await testClient.user.update({
        where: { id: firstUser.id },
        data: {
          comments: {
            connect: {
              id: comment.id,
            },
          },
        },
      });

      const dbComment = await client.comment.findUniqueOrThrow({
        where: { id: comment.id },
      });
      expect(dbComment.authorId).toEqual(firstUser.id);
    });
  });

  describe("connectOrCreate", () => {
    it("connectOrCreate connects soft deleted records", async () => {
      await testClient.user.update({
        where: { id: firstUser.id },
        data: {
          comments: {
            connectOrCreate: {
              where: { id: comment.id },
              create: { content: "Updated" },
            },
          },
        },
      });

      const dbComment = await client.comment.findUniqueOrThrow({
        where: { id: comment.id },
      });
      expect(dbComment.authorId).toEqual(firstUser.id);
    });
  });

  describe("disconnect", () => {
    it("toMany disconnect can disconnect soft deleted records", async () => {
      await testClient.user.update({
        where: { id: firstUser.id },
        data: {
          comments: {
            disconnect: {
              id: comment.id,
            },
          },
        },
      });

      const dbComment = await client.comment.findUniqueOrThrow({
        where: { id: comment.id },
      });
      expect(dbComment.authorId).toBeNull();
    });

    it("toOne disconnect can disconnect soft deleted records", async () => {
      await testClient.user.update({
        where: { id: firstUser.id },
        data: {
          profile: {
            disconnect: true,
          },
        },
      });

      const dbFirstUser = await client.user.findUniqueOrThrow({
        where: { id: firstUser.id },
      });
      expect(dbFirstUser.profileId).toBeNull();
    });
  });
});
