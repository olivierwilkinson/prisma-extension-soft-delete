import { PrismaClient, Profile, User } from "@prisma/client";
import faker from "faker";

import { createSoftDeleteExtension } from "../../src";
import client from "./client";

describe("where", () => {
  let testClient: any;
  let profile: Profile;
  let user: User;

  beforeAll(async () => {
    testClient = new PrismaClient();
    testClient = testClient.$extends(
      createSoftDeleteExtension({ models: { Comment: true, Profile: true } })
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
    // restore soft deleted profile
    await client.profile.update({
      where: { id: profile.id },
      data: {
        deleted: false,
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
    await client.user.delete({ where: { id: user.id } });
  });

  it("excludes deleted when filtering using 'is'", async () => {
    const foundUser = await testClient.user.findFirst({
      where: { profile: { is: { bio: "foo" } } },
    });
    expect(foundUser).not.toBeNull();
    expect(foundUser!.id).toEqual(user.id);

    // soft delete profile
    await testClient.profile.update({
      where: { id: profile?.id },
      data: { deleted: true },
    });

    const notFoundUser = await testClient.user.findFirst({
      where: { profile: { is: { bio: "foo" } } },
    });
    expect(notFoundUser).toBeNull();
  });

  it("excludes deleted when filtering using 'some'", async () => {
    const foundUser = await testClient.user.findFirst({
      where: { comments: { some: { content: "foo" } } },
    });
    expect(foundUser).not.toBeNull();
    expect(foundUser!.id).toEqual(user.id);

    const notFoundUser = await testClient.user.findFirst({
      where: { comments: { some: { content: "bar" } } },
    });
    expect(notFoundUser).toBeNull();
  });

  it("excludes deleted when filtering using 'every'", async () => {
    const foundUser = await testClient.user.findFirst({
      where: { comments: { every: { content: "foo" } } },
    });
    expect(foundUser).not.toBeNull();
    expect(foundUser!.id).toEqual(user.id);

    const notFoundUser = await testClient.user.findFirst({
      where: { comments: { every: { content: "bar" } } },
    });
    expect(notFoundUser).toBeNull();
  });

  it("excludes deleted when filtering using 'none'", async () => {
    const foundUser = await testClient.user.findFirst({
      where: { comments: { none: { content: "bar" } } },
    });
    expect(foundUser).not.toBeNull();
    expect(foundUser!.id).toEqual(user.id);

    const notFoundUser = await testClient.user.findFirst({
      where: { comments: { none: { content: "foo" } } },
    });
    expect(notFoundUser).toBeNull();
  });

  it("excludes deleted when using 'NOT' with 'some'", async () => {
    const foundUser = await testClient.user.findFirst({
      where: { NOT: { comments: { some: { content: "bar" } } } },
    });
    expect(foundUser).not.toBeNull();
    expect(foundUser!.id).toEqual(user.id);

    const notFoundUser = await testClient.user.findFirst({
      where: { NOT: { comments: { some: { content: "foo" } } } },
    });
    expect(notFoundUser).toBeNull();
  });

  it("excludes deleted when using 'NOT' with 'every'", async () => {
    const foundUser = await testClient.user.findFirst({
      where: { NOT: { comments: { every: { content: "bar" } } } },
    });
    expect(foundUser).not.toBeNull();
    expect(foundUser!.id).toEqual(user.id);

    const notFoundUser = await testClient.user.findFirst({
      where: { NOT: { comments: { every: { content: "foo" } } } },
    });
    expect(notFoundUser).toBeNull();
  });

  it("excludes deleted when using 'NOT' with 'none'", async () => {
    const foundUser = await testClient.user.findFirst({
      where: { NOT: { comments: { none: { content: "foo" } } } },
    });
    expect(foundUser).not.toBeNull();
    expect(foundUser!.id).toEqual(user.id);

    const notFoundUser = await testClient.user.findFirst({
      where: { NOT: { comments: { none: { content: "bar" } } } },
    });
    expect(notFoundUser).toBeNull();
  });

  it("excludes deleted when using 'NOT' with 'isNot'", async () => {
    const foundUser = await testClient.user.findFirst({
      where: { NOT: { profile: { isNot: { bio: "foo" } } } },
    });
    expect(foundUser).not.toBeNull();
    expect(foundUser!.id).toEqual(user.id);

    // soft delete profile
    await client.profile.update({
      where: { id: profile.id },
      data: {
        deleted: true,
      },
    });

    const notFoundUser = await testClient.user.findFirst({
      where: { NOT: { profile: { isNot: { bio: "foo" } } } },
    });
    expect(notFoundUser).toBeNull();
  });

  it("excludes deleted when using 'NOT' with 'is'", async () => {
    const notFoundUser = await testClient.user.findFirst({
      where: { NOT: { profile: { is: { bio: "foo" } } } },
    });
    expect(notFoundUser).toBeNull();

    // soft delete profile
    await client.profile.update({
      where: { id: profile.id },
      data: {
        deleted: true,
      },
    });

    const foundUser = await testClient.user.findFirst({
      where: { NOT: { profile: { is: { bio: "foo" } } } },
    });
    expect(foundUser).not.toBeNull();
    expect(foundUser!.id).toEqual(user.id);
  });

  it("excludes deleted when using 'NOT' nested in a 'NOT'", async () => {
    const foundUser = await testClient.user.findFirst({
      where: { NOT: { NOT: { profile: { bio: "foo" } } } },
    });
    expect(foundUser).not.toBeNull();
    expect(foundUser!.id).toEqual(user.id);

    const notFoundUser = await testClient.user.findFirst({
      where: { NOT: { NOT: { profile: { bio: "bar" } } } },
    });
    expect(notFoundUser).toBeNull();
  });

  it("excludes deleted when using 'NOT' nested in a 'NOT' with 'some'", async () => {
    const foundUser = await testClient.user.findFirst({
      where: { NOT: { NOT: { comments: { some: { content: "foo" } } } } },
    });
    expect(foundUser).not.toBeNull();
    expect(foundUser!.id).toEqual(user.id);

    const notFoundUser = await testClient.user.findFirst({
      where: { NOT: { NOT: { comments: { some: { content: "bar" } } } } },
    });
    expect(notFoundUser).toBeNull();
  });

  it("excludes deleted when using 'NOT' nested in a 'NOT' with 'every'", async () => {
    const foundUser = await testClient.user.findFirst({
      where: { NOT: { NOT: { comments: { every: { content: "foo" } } } } },
    });
    expect(foundUser).not.toBeNull();
    expect(foundUser!.id).toEqual(user.id);

    const notFoundUser = await testClient.user.findFirst({
      where: { NOT: { NOT: { comments: { every: { content: "bar" } } } } },
    });
    expect(notFoundUser).toBeNull();
  });

  it("excludes deleted when using 'NOT' nested in a 'NOT' with 'none'", async () => {
    const foundUser = await testClient.user.findFirst({
      where: { NOT: { NOT: { comments: { none: { content: "bar" } } } } },
    });
    expect(foundUser).not.toBeNull();
    expect(foundUser!.id).toEqual(user.id);

    const notFoundUser = await testClient.user.findFirst({
      where: { NOT: { NOT: { comments: { none: { content: "foo" } } } } },
    });
    expect(notFoundUser).toBeNull();
  });

  it("excludes deleted when using 'NOT' nested in a 'NOT' with 'isNot'", async () => {
    const foundUser = await testClient.user.findFirst({
      where: { NOT: { NOT: { profile: { isNot: { bio: "bar" } } } } },
    });
    expect(foundUser).not.toBeNull();
    expect(foundUser!.id).toEqual(user.id);

    const notFoundUser = await testClient.user.findFirst({
      where: { NOT: { NOT: { profile: { isNot: { bio: "foo" } } } } },
    });
    expect(notFoundUser).toBeNull();
  });

  it("excludes deleted when using 'NOT' nested in a 'NOT' with 'is'", async () => {
    const foundUser = await testClient.user.findFirst({
      where: { NOT: { NOT: { profile: { is: { bio: "foo" } } } } },
    });
    expect(foundUser).not.toBeNull();
    expect(foundUser!.id).toEqual(user.id);

    const notFoundUser = await testClient.user.findFirst({
      where: { NOT: { NOT: { profile: { is: { bio: "bar" } } } } },
    });
    expect(notFoundUser).toBeNull();
  });

  it("excludes deleted when using 'NOT' nested in a relation nested in a 'NOT'", async () => {
    const foundUser = await testClient.user.findFirst({
      where: {
        NOT: { profile: { NOT: { users: { some: { id: user.id } } } } },
      },
    });
    expect(foundUser).not.toBeNull();
    expect(foundUser!.id).toEqual(user.id);

    const notFoundUser = await testClient.user.findFirst({
      where: {
        NOT: { profile: { NOT: { users: { none: { id: user.id } } } } },
      },
    });
    expect(notFoundUser).toBeNull();
  });
});
