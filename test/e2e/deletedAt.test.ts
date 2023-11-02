import { PrismaClient, Profile, User } from "@prisma/client";
import faker from "faker";

import { createSoftDeleteExtension } from "../../src";
import client from "./client";

describe("deletedAt", () => {
  let testClient: any;
  let profile: Profile;
  let user: User;

  beforeAll(async () => {
    testClient = new PrismaClient();
    testClient = testClient.$extends(
      createSoftDeleteExtension(
        {
          models: {
            User: {
              field: "deletedAt",
              createValue: (deleted) => {
                return deleted ? new Date() : null;
              },
            },
          },
        },
      )
    );

    profile = await client.profile.create({
      data: {
        bio: "foo",
      },
    });
    user = await client.user.create({
      data: {
        email: faker.internet.email(),
        name: faker.name.findName(),
        profileId: profile.id,
        comments: {
          create: [
            { content: "foo" },
            { content: "foo", deleted: true },
            { content: "bar", deleted: true },
          ],
        },
      },
    });
  });
  afterEach(async () => {
    // restore soft deleted user
    await client.user.update({
      where: { id: user.id },
      data: {
        deletedAt: null,
      },
    });
  });
  afterAll(async () => {
    // disconnect test client
    await testClient.$disconnect();

    // delete user and related data
    await client.user.update({
      where: { id: user.id },
      data: {
        comments: { deleteMany: {} },
        profile: { delete: true },
      },
    });
    await client.user.deleteMany({ where: {} });
  });

  it("soft deletes when using delete", async () => {
    await testClient.user.delete({
      where: { id: user.id },
    });

    const softDeletedUser = await testClient.user.findFirst({
      where: { id: user.id },
    });
    expect(softDeletedUser).toBeNull();

    const dbUser = await client.user.findFirst({
      where: { id: user.id },
    });
    expect(dbUser).not.toBeNull();
    expect(dbUser?.deletedAt).not.toBeNull();
    expect(dbUser?.deletedAt).toBeInstanceOf(Date);
  });

  it("soft deletes when using deleteMany", async () => {
    await testClient.user.deleteMany({
      where: { id: user.id },
    });

    const softDeletedUser = await testClient.user.findFirst({
      where: { id: user.id },
    });
    expect(softDeletedUser).toBeNull();

    const dbUser = await client.user.findFirst({
      where: { id: user.id },
    });
    expect(dbUser).not.toBeNull();
    expect(dbUser?.deletedAt).not.toBeNull();
    expect(dbUser?.deletedAt).toBeInstanceOf(Date);
  });

  it("excludes deleted when filtering with where", async () => {
    // soft delete user
    await client.user.update({
      where: { id: user.id },
      data: { deletedAt: new Date() },
    });

    const comment = await testClient.comment.findFirst({
      where: {
        author: {
          id: user.id,
        },
      },
    });

    expect(comment).toBeNull();
  });

  it("excludes deleted when filtering with where through 'some' modifier", async () => {
    // soft delete user
    await client.user.update({
      where: { id: user.id },
      data: { deletedAt: new Date() },
    });

    const userProfile = await testClient.profile.findFirst({
      where: {
        users: {
          some: {
            id: user.id,
          },
        },
      },
    });

    expect(userProfile).toBeNull();
  });

  it("excludes deleted when filtering with where through 'every' modifier", async () => {
    // soft delete user
    await client.user.update({
      where: { id: user.id },
      data: { deletedAt: new Date() },
    });

    // add another user to profile
    await client.user.create({
      data: {
        email: faker.internet.email(),
        name: faker.name.findName(),
        profileId: profile.id,
      },
    });

    const userProfile = await testClient.profile.findFirst({
      where: {
        users: {
          every: {
            id: user.id,
          },
        },
      },
    });

    expect(userProfile).toBeNull();
  });
});
