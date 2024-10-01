import { PrismaClient, Profile, User } from "@prisma/client";
import faker from "faker";

import { createSoftDeleteExtension } from "../../src";
import client from "./client";

describe("fluent", () => {
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
      },
    });
  });
  afterAll(async () => {
    // disconnect test client
    await testClient.$disconnect();

    // delete user and related data
    await client.user.update({
      where: { id: user.id },
      data: { profile: { delete: true } },
    });
    await client.user.delete({ where: { id: user.id } });
  });

  it("supports fluent API", async () => {
    const userProfile = await testClient.user
      .findFirst({ where: { id: user.id } })
      .profile();

    expect(userProfile).toEqual(profile);
  });
});
