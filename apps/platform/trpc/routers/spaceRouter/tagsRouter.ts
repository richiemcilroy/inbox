import { router, orgProcedure } from '~platform/trpc/trpc';
import { z } from 'zod';

import { spaces } from '@u22n/database/schema';
import { eq, and } from '@u22n/database/orm';

export const spaceTagsRouter = router({
  getSpacesSettings: orgProcedure
    .input(
      z.object({
        spaceShortcode: z.string().min(1).max(64)
      })
    )
    .query(async ({ ctx, input }) => {
      const spaceQueryResponse = await ctx.db.query.spaces.findFirst({
        where: and(
          eq(spaces.orgId, ctx.org.id),
          eq(spaces.shortcode, input.spaceShortcode)
        ),
        columns: {
          publicId: true,
          shortcode: true,
          name: true,
          description: true,
          type: true,
          avatarTimestamp: true,
          convoPrefix: true,
          inheritParentPermissions: true,
          color: true,
          icon: true,
          personalSpace: true,
          createdAt: true
        },
        with: {
          parentSpace: {
            columns: {
              publicId: true,
              shortcode: true,
              name: true,
              description: true,
              color: true,
              icon: true,
              avatarTimestamp: true
            }
          },
          subSpaces: {
            columns: {
              publicId: true,
              shortcode: true,
              name: true,
              description: true,
              color: true,
              icon: true,
              avatarTimestamp: true
            }
          },
          createdByOrgMember: {
            columns: {
              publicId: true
            },
            with: {
              profile: {
                columns: {
                  publicId: true,
                  avatarTimestamp: true,
                  firstName: true,
                  lastName: true,
                  handle: true,
                  title: true,
                  blurb: true
                }
              }
            }
          },
          members: {
            columns: {
              publicId: true,
              role: true,
              addedAt: true,
              removedAt: true,
              canCreate: true,
              canRead: true,
              canComment: true,
              canReply: true,
              canDelete: true,
              canChangeStatus: true,
              canSetStatusToClosed: true,
              canAddTags: true,
              canMoveToAnotherSpace: true,
              canAddToAnotherSpace: true,
              canMergeConvos: true,
              canAddParticipants: true
            },
            with: {
              orgMember: {
                columns: {
                  publicId: true,
                  id: true
                },
                with: {
                  profile: {
                    columns: {
                      publicId: true,
                      avatarTimestamp: true,
                      firstName: true,
                      lastName: true,
                      handle: true,
                      title: true,
                      blurb: true
                    }
                  }
                }
              },
              team: {
                columns: {
                  publicId: true,
                  name: true,
                  color: true,
                  avatarTimestamp: true,
                  description: true
                }
              }
            }
          },
          statuses: {
            columns: {
              publicId: true,
              name: true,
              color: true,
              icon: true,
              description: true,
              disabled: true,
              order: true
            }
          },
          tags: {
            columns: {
              publicId: true,
              label: true,
              description: true,
              color: true,
              createdByOrgMemberId: true,
              createdAt: true
            }
          }
        }
      });
      return {
        settings: spaceQueryResponse
      };
    })
});
