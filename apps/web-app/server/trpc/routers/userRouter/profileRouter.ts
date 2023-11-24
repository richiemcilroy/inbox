import { z } from 'zod';
import { parse, stringify } from 'superjson';
import { router, userProcedure } from '../../trpc';
import type { DBType } from '@uninbox/database';
import { and, eq } from '@uninbox/database/orm';
import { users, userProfiles } from '@uninbox/database/schema';
import { nanoId, nanoIdLength } from '@uninbox/utils';

export const profileRouter = router({
  generateAvatarUploadUrl: userProcedure.query(async ({ ctx, input }) => {
    const { user } = ctx;
    const userId = user?.id || 0;
    const config = useRuntimeConfig();

    const formData = new FormData();
    formData.append('metadata', `{"userId":"${userId}"}`);

    //@ts-ignore - stack depth issue
    const uploadSignedURL: UploadSignedURLResponse = await $fetch(
      `https://api.cloudflare.com/client/v4/accounts/${config.cf.accountId}/images/v2/direct_upload`,
      {
        method: 'post',
        headers: {
          authorization: `Bearer ${config.cf.token}`
        },
        body: formData
      }
    );
    return uploadSignedURL.result;
  }),

  awaitAvatarUpload: userProcedure
    .input(
      z.object({
        uploadId: z.string().uuid()
      })
    )
    .query(async ({ ctx, input }) => {
      const config = useRuntimeConfig();
      async function fetchUntilNotDraft() {
        const imageUploadObject: ImageUploadObjectResponse = await $fetch(
          `https://api.cloudflare.com/client/v4/accounts/${config.cf.accountId}/images/v1/${input.uploadId}`,
          {
            method: 'get',
            headers: {
              authorization: `Bearer ${config.cf.token}`
            }
          }
        );
        if (imageUploadObject.result.draft) {
          // Wait for 1 second and then retry
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return fetchUntilNotDraft();
        } else {
          return imageUploadObject;
        }
      }

      const finalImageUploadObject = await fetchUntilNotDraft();
      const imageId = finalImageUploadObject.result.id;
      return imageId;
    }),

  createProfile: userProcedure
    .input(
      z.object({
        fName: z.string(),
        lName: z.string(),
        imageId: z.string().uuid().optional().nullable(),
        handle: z.string().min(2).max(20),
        defaultProfile: z.boolean().optional().default(false)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;
      const userId = user?.id || 0;

      const newPublicId = nanoId();
      const insertUserProfileResponse = await db.write
        .insert(userProfiles)
        .values({
          //@ts-ignore TS dosnt know that userId must exist on user procedures
          userId: +userId,
          publicId: newPublicId,
          avatarId: input.imageId,
          firstName: input.fName,
          lastName: input.lName,
          defaultProfile: input.defaultProfile,
          handle: input.handle
        });

      if (!insertUserProfileResponse.insertId) {
        console.log(insertUserProfileResponse);
        return {
          success: false,
          profileId: null,
          avatarId: null,
          error:
            'Something went wrong, please retry. Contact our team if it persists'
        };
      }
      return {
        success: true,
        profileId: newPublicId,
        avatarId: input.imageId,
        error: null
      };
    }),
  getUserSingleProfile: userProcedure
    .input(z.object({}).strict())
    .query(async ({ ctx, input }) => {
      const { db, user } = ctx;
      const userId = user?.id || 0;

      // TODO: Switch to FindMany when supporting multiple profiles
      const userProfilesQuery = await db.read.query.userProfiles.findFirst({
        where: and(
          eq(userProfiles.userId, +userId),
          eq(userProfiles.defaultProfile, true)
        ),
        columns: {
          publicId: true,
          avatarId: true,
          firstName: true,
          lastName: true,
          handle: true,
          title: true,
          blurb: true
        }
      });
      return {
        profile: userProfilesQuery
      };
    }),
  updateUserProfile: userProcedure
    .input(
      z.object({
        profilePublicId: z.string().min(3).max(nanoIdLength),
        fName: z.string(),
        lName: z.string(),
        title: z.string(),
        blurb: z.string(),
        imageId: z.string().uuid().optional().nullable(),
        handle: z.string().min(2).max(20),
        defaultProfile: z.boolean().optional().default(false)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;
      const userId = user?.id || 0;

      const insertUserProfileResponse = await db.write
        .update(userProfiles)
        .set({
          avatarId: input.imageId,
          firstName: input.fName,
          lastName: input.lName,
          title: input.title,
          blurb: input.blurb,
          handle: input.handle
        })
        .where(
          and(
            eq(userProfiles.publicId, input.profilePublicId),
            eq(userProfiles.userId, userId)
          )
        );

      if (!insertUserProfileResponse.rowsAffected) {
        return {
          success: false,
          error:
            'Something went wrong, please retry. Contact our team if it persists'
        };
      }

      return {
        success: true
      };
    })
});

// Types
interface ImageUploadObjectResponse {
  result: {
    id: string;
    metadata: {
      key: string;
    };
    uploaded: string;
    requireSignedURLs: boolean;
    variants: string[];
    draft: boolean;
  };
  success: boolean;
  errors: string[];
  messages: string[];
}

interface UploadSignedURLResponse {
  result: Result;
  success: boolean;
  errors: string[];
  messages: string[];
}

interface Result {
  id: string;
  uploadURL: string;
}
