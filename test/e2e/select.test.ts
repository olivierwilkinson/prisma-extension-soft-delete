import { Comment, Post, PrismaClient, Profile, User } from "@prisma/client";
import faker from "faker";

import { createSoftDeleteExtension } from "../../src";
import client from "./client";

describe("select", () => {
  let testClient: any;
  let profile: Profile;
  let user: User;
  let post1: Post;
  let post2: Post;
  let comment1: Comment;
  let comment2: Comment;
  let comment3: Comment;
  let comment4: Comment;

  beforeAll(async () => {
    testClient = new PrismaClient();
    testClient = testClient.$extends(
      createSoftDeleteExtension({ models: { User: true, Post: true, Comment: true } })
    );

    profile = await client.profile.create({
      data: {
        bio: faker.lorem.sentence(),
      },
    });
    user = await client.user.create({
      data: {
        email: faker.internet.email(),
        name: "Jack",
        profileId: profile.id,
      },
    });
    post1 = await client.post.create({
      data: {
        title: faker.lorem.sentence(),
        authorId: user.id,
        authorName: user.name,
        authorEmail: user.email,
      },
    });
    post2 = await client.post.create({
      data: {
        title: faker.lorem.sentence(),
        authorId: user.id,
        authorName: user.name,
        authorEmail: user.email,
        deleted: true,
      },
    });
    comment1 = await client.comment.create({
      data: {
        content: faker.lorem.sentence(),
        authorId: user.id,
        postId: post1.id,
      },
    });
    comment2 = await client.comment.create({
      data: {
        content: faker.lorem.sentence(),
        authorId: user.id,
        postId: post1.id,
        deleted: true,
      },
    });
    comment3 = await client.comment.create({
      data: {
        content: faker.lorem.sentence(),
        authorId: user.id,
        postId: post2.id,
      },
    });
    comment4 = await client.comment.create({
      data: {
        content: faker.lorem.sentence(),
        authorId: user.id,
        postId: post2.id,
        deleted: true,
      },
    });
  });
  afterEach(async () => {
    await Promise.all([
      // reset starting data
      client.profile.update({ where: { id: profile.id }, data: profile }),
      client.user.update({ where: { id: user.id }, data: user }),
      client.post.update({ where: { id: post1.id }, data: post1 }),
      client.post.update({ where: { id: post2.id }, data: post2 }),
      client.comment.update({ where: { id: comment1.id }, data: comment1 }),
      client.comment.update({ where: { id: comment2.id }, data: comment2 }),
      client.comment.update({ where: { id: comment3.id }, data: comment3 }),
      client.comment.update({ where: { id: comment4.id }, data: comment4 }),
    ]);
  });
  afterAll(async () => {
    await testClient.$disconnect();
    await client.user.update({
      where: { id: user.id },
      data: {
        profile: { delete: true },
        posts: { deleteMany: {} },
        comments: { deleteMany: {} },
      },
    });
    await client.user.deleteMany({ where: {} });
  });

  describe("findFirst", () => {
    it("findFirst with select", async () => {
      const foundUser = await testClient.user.findFirst({
        select: { id: true },
      });

      expect(foundUser).not.toBeNull();
      expect(foundUser!.id).toEqual(user.id);
    });

    it("findFirst with select deleted field", async () => {
      const foundUser = await testClient.user.findFirst({
        select: { id: true, deleted: true },
      });

      expect(foundUser).not.toBeNull();
      expect(foundUser!.id).toEqual(user.id);
    });

    describe("with nested select", () => {
      it("findFirst with include", async () => {
        const foundUser = await testClient.user.findFirst({
          include: {
            posts: {
              include: {
                comments: true
              }
            },
          },
        });

        expect(foundUser).not.toBeNull();
        expect(foundUser!.posts).toHaveLength(1);
        expect(foundUser!.posts[0].comments).toHaveLength(1);
        expect(foundUser!.posts[0].comments[0].id).toBe(comment1.id);
      });

      it("findFirst with select", async () => {
        const foundUser = await testClient.user.findFirst({
          select: {
            id: true,
            posts: {
              select: {
                id: true,
                comments: {
                  select: { id: true }
                }
              }
            },
          },
        });

        expect(foundUser).not.toBeNull();
        expect(foundUser!.posts).toHaveLength(1);
        expect(foundUser!.posts[0].comments).toHaveLength(1);
        expect(foundUser!.posts[0].comments[0].id).toBe(comment1.id);
      });

      it("findFirst with select deleted field", async () => {
        const foundUser = await testClient.user.findFirst({
          select: {
            id: true,
            deleted: true,
            posts: {
              select: {
                id: true,
                deleted: true,
                comments: {
                  select: { id: true, deleted: true }
                }
              }
            },
          },
        });

        expect(foundUser).not.toBeNull();
        expect(foundUser!.posts).toHaveLength(1);
        expect(foundUser!.posts[0].comments).toHaveLength(1);
        expect(foundUser!.posts[0].comments[0].id).toBe(comment1.id);
      });

      it("findFirst with select only deepest fields", async () => {
        const foundUser = await testClient.user.findFirst({
          select: {
            posts: {
              select: {
                comments: {
                  select: { id: true }
                }
              }
            },
          },
        });

        expect(foundUser).not.toBeNull();
        expect(foundUser!.posts).toHaveLength(1);
        expect(foundUser!.posts[0].comments).toHaveLength(1);
        expect(foundUser!.posts[0].comments[0].id).toBe(comment1.id);
      });

      it("findFirst with include and select", async () => {
        const foundUser = await testClient.user.findFirst({
          include: {
            posts: {
              select: {
                comments: {
                  select: { id: true }
                }
              }
            },
          },
        });

        expect(foundUser).not.toBeNull();
        expect(foundUser!.posts).toHaveLength(1);
        // TODO: this should be 1
        expect(foundUser!.posts[0].comments).toHaveLength(1);
        expect(foundUser!.posts[0].comments[0].id).toBe(comment1.id);
      });

      it("findFirst with include and select deleted field", async () => {
        const foundUser = await testClient.user.findFirst({
          include: {
            posts: {
              select: {
                comments: {
                  select: { id: true, deleted: true }
                }
              }
            },
          },
        });

        expect(foundUser).not.toBeNull();
        expect(foundUser!.posts).toHaveLength(1);
        expect(foundUser!.posts[0].comments).toHaveLength(1);
        expect(foundUser!.posts[0].comments[0].id).toBe(comment1.id);
      });
    });
  });
});
