import { PrismaClient, User } from "@prisma/client";
import faker from "faker";

import { createSoftDeleteExtension } from "../../src";
import client from "./client";

describe("nested reads", () => {
  let testClient: any;
  let user: User;

  beforeAll(async () => {
    testClient = new PrismaClient();
    testClient = testClient.$extends(
      createSoftDeleteExtension(
        { models: { Comment: true, Profile: true } },
        // @ts-expect-error - we don't know what the client is
        { client: testClient }
      )
    );

    user = await client.user.create({
      data: {
        email: faker.internet.email(),
        name: faker.name.findName(),
        profile: { create: { bio: "foo" } },
      },
    });

    await client.comment.create({
      data: {
        author: { connect: { id: user.id } },
        content: "foo",
        replies: {
          create: [
            { content: "baz" },
            { content: "baz", deleted: true },
            { content: "qux", deleted: true },
          ],
        },
        post: {
          create: {
            title: "foo-comment-post-title",
            authorId: user.id,
            author: {
              connect: { id: user.id },
            },
          },
        },
      },
    });

    await client.comment.create({
      data: {
        author: { connect: { id: user.id } },
        content: "bar",
        deleted: true,
        post: {
          create: {
            title: "bar-comment-post-title",
            authorId: user.id,
            author: {
              connect: { id: user.id },
            },
          },
        },
      },
    });
  });
  afterEach(async () => {
    // restore soft deleted profile
    await client.profile.updateMany({
      where: {},
      data: { deleted: false },
    });
  });
  afterAll(async () => {
    await testClient.$disconnect();

    await client.user.deleteMany({ where: {} });
    await client.comment.deleteMany({ where: {} });
    await client.profile.deleteMany({ where: {} });
  });

  describe("include", () => {
    it("excludes deleted when including toMany relation", async () => {
      const { comments } = await testClient.user.findUniqueOrThrow({
        where: { id: user.id },
        include: {
          comments: true,
        },
      });

      expect(comments).toHaveLength(1);
      expect(comments[0].content).toEqual("foo");
    });

    it("excludes deleted when including toOne relation", async () => {
      const {
        profile: nonDeletedProfile,
      } = await testClient.user.findUniqueOrThrow({
        where: { id: user.id },
        include: {
          profile: true,
        },
      });

      expect(nonDeletedProfile).not.toBeNull();
      expect(nonDeletedProfile!.bio).toEqual("foo");

      // soft delete profiles
      await client.profile.updateMany({
        where: {},
        data: {
          deleted: true,
        },
      });

      const {
        profile: softDeletedProfile,
      } = await testClient.user.findUniqueOrThrow({
        where: { id: user.id },
        include: {
          profile: true,
        },
      });

      expect(softDeletedProfile).toBeNull();
    });

    it("excludes deleted when deeply including relations", async () => {
      const {
        comments: nonDeletedComments,
      } = await testClient.user.findUniqueOrThrow({
        where: { id: user.id },
        include: {
          comments: {
            include: {
              post: true,
              replies: true,
            },
          },
        },
      });

      expect(nonDeletedComments).toHaveLength(1);
      expect(nonDeletedComments[0].content).toEqual("foo");

      expect(nonDeletedComments[0].replies).toHaveLength(1);
      expect(nonDeletedComments[0].replies[0].content).toEqual("baz");
    });

    it("excludes deleted when including fields with where", async () => {
      const {
        comments: nonDeletedComments,
      } = await testClient.user.findUniqueOrThrow({
        where: { id: user.id },
        include: {
          comments: {
            where: {
              content: "bar",
            },
          },
        },
      });

      expect(nonDeletedComments).toHaveLength(0);
    });

    it("excludes deleted when including fields using where that targets soft-deleted model", async () => {
      const { posts } = await testClient.user.findUniqueOrThrow({
        where: { id: user.id },
        include: {
          posts: {
            where: {
              comments: {
                some: {
                  content: {
                    in: ["foo", "bar"],
                  },
                },
              },
            },
          },
        },
      });

      expect(posts).toHaveLength(1);
    });
  });

  describe("select", () => {
    it("excludes deleted when selecting toMany relation", async () => {
      const { comments } = await testClient.user.findUniqueOrThrow({
        where: { id: user.id },
        select: {
          comments: true,
        },
      });

      expect(comments).toHaveLength(1);
      expect(comments[0].content).toEqual("foo");
    });

    it("excludes deleted when selecting toOne relation", async () => {
      const {
        profile: nonDeletedProfile,
      } = await testClient.user.findUniqueOrThrow({
        where: { id: user.id },
        select: {
          profile: true,
        },
      });

      expect(nonDeletedProfile).not.toBeNull();
      expect(nonDeletedProfile!.bio).toEqual("foo");

      // soft delete profiles
      await client.profile.updateMany({
        where: {},
        data: {
          deleted: true,
        },
      });

      const {
        profile: softDeletedProfile,
      } = await testClient.user.findUniqueOrThrow({
        where: { id: user.id },
        include: {
          profile: true,
        },
      });

      expect(softDeletedProfile).toBeNull();
    });

    it("excludes deleted when deeply including relations", async () => {
      const {
        comments: nonDeletedComments,
      } = await testClient.user.findUniqueOrThrow({
        where: { id: user.id },
        select: {
          comments: {
            select: {
              content: true,
              post: true,
              replies: true,
            },
          },
        },
      });

      expect(nonDeletedComments).toHaveLength(1);
      expect(nonDeletedComments[0].content).toEqual("foo");

      expect(nonDeletedComments[0].replies).toHaveLength(1);
      expect(nonDeletedComments[0].replies[0].content).toEqual("baz");
    });

    it("excludes deleted when selecting fields through an include", async () => {
      const {
        comments: nonDeletedComments,
      } = await testClient.user.findUniqueOrThrow({
        where: { id: user.id },
        include: {
          comments: {
            select: {
              content: true,
              post: true,
              replies: true,
            },
          },
        },
      });

      expect(nonDeletedComments).toHaveLength(1);
      expect(nonDeletedComments[0].content).toEqual("foo");

      expect(nonDeletedComments[0].replies).toHaveLength(1);
      expect(nonDeletedComments[0].replies[0].content).toEqual("baz");
    });

    it("excludes deleted when selecting fields with where", async () => {
      const {
        comments: nonDeletedComments,
      } = await testClient.user.findUniqueOrThrow({
        where: { id: user.id },
        select: {
          comments: {
            where: {
              content: "bar",
            },
          },
        },
      });

      expect(nonDeletedComments).toHaveLength(0);
    });

    it("excludes deleted when selecting fields with where through an include", async () => {
      const {
        comments: nonDeletedComments,
      } = await testClient.user.findUniqueOrThrow({
        where: { id: user.id },
        include: {
          comments: {
            select: {
              replies: {
                where: {
                  content: "qux",
                },
              },
            },
          },
        },
      });

      expect(nonDeletedComments).toHaveLength(1);
      expect(nonDeletedComments[0].replies).toHaveLength(0);
    });

    it("excludes deleted when selecting fields using where that targets soft-deleted model", async () => {
      const { posts } = await testClient.user.findUniqueOrThrow({
        where: { id: user.id },
        include: {
          posts: {
            where: {
              comments: {
                some: {
                  content: {
                    in: ["foo", "bar"],
                  },
                },
              },
            },
          },
        },
      });

      expect(posts).toHaveLength(1);
    });

    it("excludes deleted when including relation and filtering by every", async () => {
      const { comments } = await testClient.user.findUniqueOrThrow({
        where: { id: user.id },
        include: {
          comments: {
            where: {
              replies: {
                every: {
                  content: {
                    in: ["baz", "qux"],
                  },
                },
              },
            },
          },
        },
      });

      expect(comments).toHaveLength(1);
    });

    it("excludes deleted when including relation and filtering by every in a NOT", async () => {
      const { comments } = await testClient.user.findUniqueOrThrow({
        where: { id: user.id },
        include: {
          comments: {
            where: {
              NOT: {
                replies: {
                  every: {
                    content: {
                      in: ["baz", "qux"],
                    },
                  },
                },
              },
            },
          },
        },
      });

      expect(comments).toHaveLength(0);
    });

    it("excludes deleted selected toOne relations even when deleted field not selected", async () => {
      const { profile } = await testClient.user.findUniqueOrThrow({
        where: { id: user.id },
        select: {
          profile: {
            select: {
              id: true,
              bio: true,
            },
          },
        },
      });

      expect(profile).not.toBeNull();

      expect(profile!.deleted).toBeUndefined();

      // soft delete profile
      await client.profile.update({
        where: { id: profile!.id },
        data: {
          deleted: true,
        },
      });

      const {
        profile: softDeletedProfile,
      } = await testClient.user.findUniqueOrThrow({
        where: { id: user.id },
        select: {
          profile: {
            select: {
              id: true,
              bio: true,
            },
          },
        },
      });

      expect(softDeletedProfile).toBeNull();
    });
  });
});
