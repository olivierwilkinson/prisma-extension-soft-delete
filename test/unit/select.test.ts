import faker from "faker";

import { createSoftDeleteExtension } from "../../src";
import { MockClient } from "./utils/mockClient";

describe("select", () => {
  it("does not change select params if model is not in the list", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({ models: {} })
    );

    await extendedClient.user.update({
      where: { id: 1 },
      data: { email: "test@test.com" },
      select: { comments: true },
    });

    // params have not been modified
    expect(extendedClient.user.update.query).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { email: "test@test.com" },
      select: { comments: true },
    });
  });

  it("excludes deleted records from selects", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { Comment: true },
      })
    );

    await extendedClient.user.update({
      where: { id: 1 },
      data: { email: "test@test.com" },
      select: {
        comments: true,
      },
    });

    // params have been modified
    expect(extendedClient.user.update.query).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { email: "test@test.com" },
      select: {
        comments: {
          where: {
            deleted: false,
          },
        },
      },
    });
  });

  it("excludes deleted records from selects using where", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { Comment: true },
      })
    );

    const content = faker.lorem.sentence();

    await extendedClient.user.update({
      where: { id: 1 },
      data: { email: "test@test.com" },
      select: {
        comments: {
          where: { content },
        },
      },
    });

    // params have been modified
    expect(extendedClient.user.update.query).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { email: "test@test.com" },
      select: {
        comments: {
          where: {
            content,
            deleted: false,
          },
        },
      },
    });
  });

  it("excludes deleted records from include with select", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { Comment: true },
      })
    );

    await extendedClient.user.update({
      where: { id: 1 },
      data: { email: "test@test.com" },
      include: {
        comments: {
          select: { id: true },
        },
      },
    });

    // params have not been modified
    expect(extendedClient.user.update.query).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { email: "test@test.com" },
      include: {
        comments: {
          select: { id: true },
          where: { deleted: false },
        },
      },
    });
  });

  it("allows explicitly selecting deleted records using select", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { Comment: true },
      })
    );

    await extendedClient.user.update({
      where: { id: 1 },
      data: { email: "test@test.com" },
      select: {
        comments: {
          where: {
            deleted: true,
          },
        },
      },
    });

    // params have not been modified
    expect(extendedClient.user.update.query).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { email: "test@test.com" },
      select: {
        comments: {
          where: {
            deleted: true,
          },
        },
      },
    });
  });
});
