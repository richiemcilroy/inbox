'use client';

import {
  ArrowLeft,
  Check,
  Circle,
  Globe,
  Pencil,
  Plus,
  SquaresFour,
  UsersThree
} from '@phosphor-icons/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/src/components/shadcn-ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage
} from '@/src/components/shadcn-ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/src/components/shadcn-ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@radix-ui/react-tooltip';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { type SpaceStatus, type SpaceType } from '@u22n/utils/spaces';
import { type UiColor, uiColors } from '@u22n/utils/colors';
import { Button } from '@/src/components/shadcn-ui/button';
import { Switch } from '@/src/components/shadcn-ui/switch';
import { CopyButton } from '@/src/components/copy-button';
import { Input } from '@/src/components/shadcn-ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { type TypeId } from '@u22n/utils/typeid';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { platform } from '@/src/lib/trpc';
import { cn } from '@/src/lib/utils';
import Link from 'next/link';
import { z } from 'zod';

export default function ShorcodeTestPage() {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const spaceShortcode = useParams().spaceShortCode as string;

  const [showSaved, setShowSaved] = useState(false);

  const { data: spaceSettings, isLoading } =
    platform.spaces.settings.getSpacesSettings.useQuery({
      orgShortcode: orgShortcode,
      spaceShortcode: spaceShortcode
    });

  const isSpaceAdmin = useMemo(() => {
    return spaceSettings?.role === 'admin';
  }, [spaceSettings?.role]);

  useEffect(() => {
    if (!showSaved) return;
    setTimeout(() => {
      setShowSaved(false);
    }, 2500);
  }, [showSaved]);

  return (
    <div className="flex w-full flex-col items-center overflow-y-auto">
      <div className="flex max-w-screen-sm flex-col gap-8 p-4">
        {isLoading ? (
          <div>Loading...</div>
        ) : !spaceSettings?.settings ? (
          <div>Space Not Found</div>
        ) : (
          <div className="flex w-full flex-col gap-8 p-0">
            <div className="border-base-5 flex w-full flex-row items-center justify-between gap-4 border-b pb-2">
              <div className="flex w-full flex-row items-center justify-between gap-4">
                <div className="flex w-full flex-row items-center gap-4">
                  <div>
                    <Button
                      asChild
                      size="icon-sm"
                      variant="outline">
                      <Link href="./convos">
                        <ArrowLeft className="size-4" />
                      </Link>
                    </Button>
                  </div>

                  <div className="flex flex-col gap-1">
                    <NameField
                      orgShortcode={orgShortcode}
                      spaceShortcode={spaceShortcode}
                      initialValue={spaceSettings?.settings?.name}
                      showSaved={setShowSaved}
                      isSpaceAdmin={isSpaceAdmin}
                    />

                    <DescriptionField
                      orgShortcode={orgShortcode}
                      spaceShortcode={spaceShortcode}
                      initialValue={spaceSettings?.settings?.description ?? ''}
                      showSaved={setShowSaved}
                      isSpaceAdmin={isSpaceAdmin}
                    />
                  </div>
                </div>
              </div>
              {showSaved && (
                <div className="flex flex-row items-center gap-2">
                  <span className="text-base-11 text-sm">Saved</span>
                  <Check className="text-jade-9 size-3" />
                </div>
              )}
            </div>
            {!isSpaceAdmin && (
              <div className="flex w-full flex-row items-center gap-1">
                <span className="text-red-11 w-fit text-[10px] uppercase">
                  Only admins of this space can edit settings
                </span>
              </div>
            )}
            <div className="flex w-full flex-row items-center gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-base-11 text-sm">Space ID</span>
                <div className="flex w-full flex-row items-center gap-2">
                  <span className="text-base-12 w-fit text-sm">
                    {spaceSettings?.settings?.publicId}
                  </span>
                  <CopyButton text={spaceSettings?.settings?.publicId ?? ''} />
                </div>
              </div>
            </div>
            <ColorField
              orgShortcode={orgShortcode}
              spaceShortcode={spaceShortcode}
              initialValue={spaceSettings?.settings?.color}
              showSaved={setShowSaved}
              isSpaceAdmin={isSpaceAdmin}
            />
            <TypeField
              orgShortcode={orgShortcode}
              spaceShortcode={spaceShortcode}
              initialValue={spaceSettings?.settings?.type}
              showSaved={setShowSaved}
              isSpaceAdmin={isSpaceAdmin}
            />
            <Statuses
              orgShortcode={orgShortcode}
              spaceShortcode={spaceShortcode}
              showSaved={setShowSaved}
              isSpaceAdmin={isSpaceAdmin}
            />

            <span>
              Hello {spaceShortcode} {JSON.stringify(spaceSettings, null, '\t')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function NameField({
  orgShortcode,
  spaceShortcode,
  initialValue,
  showSaved,
  isSpaceAdmin
}: {
  orgShortcode: string;
  spaceShortcode: string;
  initialValue: string;
  isSpaceAdmin: boolean;
  showSaved: (value: boolean) => void;
}) {
  const { mutateAsync: setSpaceName, isSuccess: setSpaceNameSuccess } =
    platform.spaces.settings.setSpaceName.useMutation();
  const [editName, setEditName] = useState(initialValue);
  const [showEditNameField, setShowEditNameField] = useState(false);
  const orgMemberSpacesQueryCache =
    platform.useUtils().spaces.getOrgMemberSpaces;

  const debouncedInput = useDebouncedCallback(
    async (value: string) => {
      if (value === initialValue && !setSpaceNameSuccess) return;
      const parsed = z.string().min(1).max(64).safeParse(value);
      if (!parsed.success) {
        return {
          error: parsed.error.issues[0]?.message ?? null,
          success: false
        };
      }
      await setSpaceName({
        orgShortcode: orgShortcode,
        spaceShortcode: spaceShortcode,
        spaceName: editName
      });
      showSaved(true);
      await orgMemberSpacesQueryCache.invalidate();
    },
    // delay in ms
    1000
  );

  useEffect(() => {
    if (typeof editName === 'undefined') return;
    void debouncedInput(editName);
  }, [editName, debouncedInput]);

  return (
    <>
      {showEditNameField ? (
        <div className="flex w-full flex-row items-center gap-2">
          <Input
            label="Space Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
        </div>
      ) : (
        <div className="flex flex-row items-center gap-2">
          <span className="font-display text-lg">{initialValue}</span>
          <Button
            variant={'ghost'}
            size={'icon-sm'}
            disabled={!isSpaceAdmin}
            onClick={() => {
              setShowEditNameField(true);
            }}>
            <Pencil className="size-4" />
          </Button>
        </div>
      )}
    </>
  );
}

function DescriptionField({
  orgShortcode,
  spaceShortcode,
  initialValue,
  showSaved,
  isSpaceAdmin
}: {
  orgShortcode: string;
  spaceShortcode: string;
  initialValue: string;
  isSpaceAdmin: boolean;
  showSaved: (value: boolean) => void;
}) {
  const {
    mutateAsync: setSpaceDescription,
    isSuccess: setSpaceDescriptionSuccess
  } = platform.spaces.settings.setSpaceDescription.useMutation();
  const [editDescription, setEditDescription] = useState(initialValue);
  const [showEditDescriptionField, setShowEditDescriptionField] =
    useState(false);
  const orgMemberSpacesQueryCache =
    platform.useUtils().spaces.getOrgMemberSpaces;

  const debouncedInput = useDebouncedCallback(
    async (value) => {
      if (value === initialValue && !setSpaceDescriptionSuccess) return;
      const parsed = z
        .string()
        .min(1)
        .max(64)
        .safeParse(value as string);
      if (!parsed.success) {
        return {
          error: parsed.error.issues[0]?.message ?? null,
          success: false
        };
      }
      await setSpaceDescription({
        orgShortcode: orgShortcode,
        spaceShortcode: spaceShortcode,
        spaceDescription: editDescription
      });
      showSaved(true);
      await orgMemberSpacesQueryCache.invalidate();
    },
    // delay in ms
    1000
  );

  useEffect(() => {
    if (typeof editDescription === 'undefined') return;
    void debouncedInput(editDescription);
  }, [editDescription, debouncedInput]);

  return (
    <>
      {showEditDescriptionField ? (
        <div className="flex w-full flex-row items-center gap-2">
          <Input
            label="Space Name"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
          />
        </div>
      ) : (
        <div className="flex flex-row items-center gap-2">
          <span className="">{initialValue}</span>
          <Button
            variant={'ghost'}
            size={'icon-sm'}
            disabled={!isSpaceAdmin}
            onClick={() => {
              setShowEditDescriptionField(true);
            }}>
            <Pencil className="size-4" />
          </Button>
        </div>
      )}
    </>
  );
}

function ColorField({
  orgShortcode,
  spaceShortcode,
  initialValue,
  showSaved,
  isSpaceAdmin
}: {
  orgShortcode: string;
  spaceShortcode: string;
  initialValue: string;
  isSpaceAdmin: boolean;
  showSaved: (value: boolean) => void;
}) {
  const { mutateAsync: setSpaceColor } =
    platform.spaces.settings.setSpaceColor.useMutation();
  const [activeColor, setActiveColor] = useState(initialValue);

  const orgMemberSpacesQueryCache =
    platform.useUtils().spaces.getOrgMemberSpaces;

  async function handleSpaceColor(value: UiColor) {
    await setSpaceColor({
      orgShortcode: orgShortcode,
      spaceShortcode: spaceShortcode,
      spaceColor: value
    });
    setActiveColor(value);
    showSaved(true);
    await orgMemberSpacesQueryCache.invalidate();
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-base-11 text-sm">Color</span>
      <div
        className="flex flex-row flex-wrap gap-3"
        style={{ padding: '0px' }}>
        {uiColors.map((color) => (
          <div
            key={color}
            className={cn(
              'flex size-8 min-h-8 min-w-8 items-center justify-center rounded-sm',
              activeColor === color ? `ring-base-9 ring-1 ring-offset-2` : '',
              isSpaceAdmin ? 'cursor-pointer' : 'cursor-not-allowed'
            )}
            style={{
              backgroundColor: `var(--${color}4)`
            }}
            onClick={async () => {
              isSpaceAdmin && (await handleSpaceColor(color));
            }}>
            {activeColor === color ? (
              <Check
                className={'size-5'}
                weight="regular"
                style={{
                  color: `var(--${color}9)`
                }}
              />
            ) : (
              <SquaresFour
                className={'size-5'}
                weight="regular"
                style={{
                  color: `var(--${color}9)`
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TypeField({
  orgShortcode,
  spaceShortcode,
  initialValue,
  showSaved,
  isSpaceAdmin
}: {
  orgShortcode: string;
  spaceShortcode: string;
  initialValue: string;
  isSpaceAdmin: boolean;
  showSaved: (value: boolean) => void;
}) {
  const { data: canAddSpace } = platform.org.iCanHaz.space.useQuery(
    {
      orgShortcode: orgShortcode
    },
    {
      staleTime: 1000
    }
  );

  const { mutateAsync: setSpaceType } =
    platform.spaces.settings.setSpaceType.useMutation();
  const [activeType, setActiveType] = useState(initialValue);

  const orgMemberSpacesQueryCache =
    platform.useUtils().spaces.getOrgMemberSpaces;

  async function handleSpaceType(value: SpaceType) {
    await setSpaceType({
      orgShortcode: orgShortcode,
      spaceShortcode: spaceShortcode,
      spaceType: value
    });
    setActiveType(value);
    showSaved(true);
    await orgMemberSpacesQueryCache.invalidate();
  }

  return (
    <>
      <Select
        onValueChange={(value) => handleSpaceType(value as SpaceType)}
        disabled={!isSpaceAdmin}
        value={activeType}>
        <div className="flex flex-col gap-2">
          <span className="text-base-11 text-sm">Permissions</span>
          <SelectTrigger className="h-18">
            <SelectValue placeholder="Select a verified email to display" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              value="open"
              className="hover:bg-base-3 w-full rounded-sm">
              <div className="flex flex-row items-center justify-start gap-4 rounded-md p-1">
                <Globe className="h-6 w-6" />
                <div className="flex grow flex-col justify-start gap-2 text-left">
                  <span className="font-semibold">Open</span>
                  <span className="text-base-11 text-balance text-xs">
                    Everyone can see this Space, read messages and post comments
                  </span>
                </div>
              </div>
            </SelectItem>
            {canAddSpace?.private ? (
              <SelectItem
                value="private"
                className="hover:bg-base-3 w-full rounded-sm">
                <div className="flex flex-row items-center justify-start gap-4 rounded-md p-1">
                  <UsersThree className="h-6 w-6" />
                  <div className="flex grow flex-col justify-start gap-2 text-left">
                    <span className="font-semibold">Private</span>
                    <span className="text-base-11 text-balance text-xs">
                      Only specific people can see and interact with this space
                    </span>
                  </div>
                </div>
              </SelectItem>
            ) : (
              <Tooltip>
                <TooltipTrigger>
                  <SelectItem
                    disabled
                    value="private"
                    className="hover:bg-base-3 w-full rounded-sm">
                    <div className="flex flex-row items-center justify-start gap-4 rounded-md p-1">
                      <UsersThree className="h-6 w-6" />
                      <div className="flex grow flex-col justify-start gap-2 text-left">
                        <div className="flex flex-row items-center gap-2">
                          <span className="font-semibold">Private</span>
                          <span className="text-base-1 bg-base-12 rounded-sm px-1.5 py-0.5 text-xs">
                            Pro plan
                          </span>
                        </div>
                        <span className="text-base-11 text-xs">
                          Only specific people can see and interact with this
                          space
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                </TooltipTrigger>
                <TooltipContent>
                  <span>
                    Upgrade to <span className="font-semibold">Pro</span> plan
                    to enable this feature
                  </span>
                </TooltipContent>
              </Tooltip>
            )}
          </SelectContent>
        </div>
      </Select>
    </>
  );
}

function Statuses({
  orgShortcode,
  spaceShortcode,
  showSaved,
  isSpaceAdmin
}: {
  orgShortcode: string;
  spaceShortcode: string;
  isSpaceAdmin: boolean;
  showSaved: (value: boolean) => void;
}) {
  const { data: spaceStatuses, isLoading: statusLoading } =
    platform.spaces.statuses.getSpacesStatuses.useQuery({
      orgShortcode: orgShortcode,
      spaceShortcode: spaceShortcode
    });

  const { data: canIHazStatuses } = platform.org.iCanHaz.spaceStatus.useQuery({
    orgShortcode: orgShortcode
  });

  const { mutateAsync: setSpaceType } =
    platform.spaces.settings.setSpaceType.useMutation();

  const orgMemberSpacesQueryCache =
    platform.useUtils().spaces.getOrgMemberSpaces;

  const [useStatuses, setUseStatuses] = useState<boolean>(
    !!spaceStatuses?.open?.length ||
      !!spaceStatuses?.active?.length ||
      !!spaceStatuses?.closed?.length
  );

  const [showNewOpenStatus, setShowNewOpenStatus] = useState(false);
  useEffect(() => {
    if (showNewOpenStatus) return;
    showSaved(true);
    setTimeout(() => {
      setShowNewOpenStatus(false);
    }, 1000);
  }, [showNewOpenStatus, showSaved]);

  const [showNewActiveStatus, setShowNewActiveStatus] = useState(false);
  useEffect(() => {
    if (showNewActiveStatus) return;
    showSaved(true);
    setTimeout(() => {
      setShowNewActiveStatus(false);
    }, 1000);
  }, [showNewActiveStatus, showSaved]);

  const [showNewClosedStatus, setShowNewClosedStatus] = useState(false);
  useEffect(() => {
    if (showNewClosedStatus) return;
    showSaved(true);
    setTimeout(() => {
      setShowNewClosedStatus(false);
    }, 1000);
  }, [showNewClosedStatus, showSaved]);

  const [subShowSaved, setSubShowSaved] = useState(false);
  useEffect(() => {
    if (!subShowSaved) return;
    showSaved(true);
    setTimeout(() => {
      setSubShowSaved(false);
    }, 2500);
  }, [subShowSaved, showSaved]);

  return (
    <div className="flex w-full flex-col gap-2">
      <span className="text-base-11 text-sm">Statuses</span>
      {statusLoading ? (
        <div>
          <span>Loading Statuses...</span>
        </div>
      ) : !useStatuses ? (
        <div className="flex w-full flex-row items-center justify-between gap-8">
          <span>Enable Statuses</span>
          <Switch onClick={() => setUseStatuses(true)} />
        </div>
      ) : (
        <div className="bg-base-2 border-base-5 flex flex-col gap-2 rounded-md border p-4">
          <div className="flex flex-col gap-2">
            <div className="bg-base-3 flex w-full flex-row justify-between gap-2 rounded-md p-4">
              <span className="font-medium">Open</span>
              <Button
                variant={'ghost'}
                size={'icon-sm'}
                onClick={() => setShowNewOpenStatus(true)}>
                <Plus />
              </Button>
            </div>
            <div className="dragdrop-area flex flex-col gap-6 p-4">
              {!spaceStatuses?.open?.length ? (
                <span>No Statuses</span>
              ) : (
                spaceStatuses?.open?.map((status) => (
                  <StatusItem
                    key={status.publicId}
                    status={status}
                    orgShortcode={orgShortcode}
                    spaceShortcode={spaceShortcode}
                    showSavedStatus={setSubShowSaved}
                  />
                ))
              )}
              {showNewOpenStatus && (
                <NewSpaceStatus
                  orgShortcode={orgShortcode}
                  order={
                    spaceStatuses?.open?.length
                      ? spaceStatuses?.open?.length + 1
                      : 1
                  }
                  spaceShortcode={spaceShortcode}
                  type="open"
                  showNewStatusComponent={setShowNewOpenStatus}
                />
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="bg-base-3 flex w-full flex-row justify-between gap-2 rounded-md p-4">
              <span className="font-medium">Active</span>
              <Button
                variant={'ghost'}
                size={'icon-sm'}
                onClick={() => setShowNewActiveStatus(true)}>
                <Plus />
              </Button>
            </div>
            <div className="dragdrop-area flex flex-col gap-6 p-4">
              {!spaceStatuses?.active?.length ? (
                <span>No Statuses</span>
              ) : (
                spaceStatuses?.active?.map((status) => (
                  <StatusItem
                    key={status.publicId}
                    status={status}
                    orgShortcode={orgShortcode}
                    spaceShortcode={spaceShortcode}
                    showSavedStatus={setSubShowSaved}
                  />
                ))
              )}
              {showNewActiveStatus && (
                <NewSpaceStatus
                  orgShortcode={orgShortcode}
                  order={
                    spaceStatuses?.active?.length
                      ? spaceStatuses?.active?.length + 1
                      : 1
                  }
                  spaceShortcode={spaceShortcode}
                  type="active"
                  showNewStatusComponent={setShowNewActiveStatus}
                />
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="bg-base-3 flex w-full flex-row justify-between gap-2 rounded-md p-4">
              <span className="font-medium">Closed</span>
              <Button
                variant={'ghost'}
                size={'icon-sm'}
                onClick={() => setShowNewClosedStatus(true)}>
                <Plus />
              </Button>
            </div>
            <div className="dragdrop-area flex flex-col gap-6 p-4">
              {!spaceStatuses?.closed?.length ? (
                <span>No Statuses</span>
              ) : (
                spaceStatuses?.closed?.map((status) => (
                  <StatusItem
                    key={status.publicId}
                    status={status}
                    orgShortcode={orgShortcode}
                    spaceShortcode={spaceShortcode}
                    showSavedStatus={setSubShowSaved}
                  />
                ))
              )}
              {showNewClosedStatus && (
                <NewSpaceStatus
                  orgShortcode={orgShortcode}
                  order={
                    spaceStatuses?.closed?.length
                      ? spaceStatuses?.closed?.length + 1
                      : 1
                  }
                  spaceShortcode={spaceShortcode}
                  type="closed"
                  showNewStatusComponent={setShowNewClosedStatus}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusItem({
  orgShortcode,
  spaceShortcode,
  status,
  showSavedStatus
}: {
  orgShortcode: string;
  spaceShortcode: string;
  showSavedStatus: (value: boolean) => void;
  status: {
    name: string;
    color: UiColor;
    description: string | null;
    publicId: TypeId<'spaceStatuses'>;
    icon: string;
    disabled: boolean;
    type: SpaceStatus;
    order: number;
  };
}) {
  const [editStatus, setEditStatus] = useState<boolean>(false);

  const { mutateAsync: editSpaceStatus, isPending } =
    platform.spaces.statuses.editSpaceStatus.useMutation();

  const orgMemberSpacesQueryCache =
    platform.useUtils().spaces.getOrgMemberSpaces;
  const spaceStatusQueryCache =
    platform.useUtils().spaces.statuses.getSpacesStatuses;

  const editSpaceStatusFormSchema = z.object({
    name: z.string().min(1).max(32),
    description: z.string().min(0).max(128).optional(),
    color: z.enum(uiColors)
  });

  const form = useForm<z.infer<typeof editSpaceStatusFormSchema>>({
    resolver: zodResolver(editSpaceStatusFormSchema),
    defaultValues: {
      name: status.name,
      description: status.description ?? '',
      color: status.color
    }
  });

  const handleSubmit = async (
    values: z.infer<typeof editSpaceStatusFormSchema>
  ) => {
    await editSpaceStatus({
      orgShortcode: orgShortcode,
      spaceShortcode: spaceShortcode,
      name: values.name,
      description: values.description,
      color: values.color,
      spaceStatusPublicId: status.publicId
    });

    showSavedStatus(true);
    setEditStatus(false);
    await orgMemberSpacesQueryCache.invalidate();
    await spaceStatusQueryCache.invalidate();
    form.reset();
  };
  return (
    <>
      {!editStatus ? (
        <div className="flex flex-row items-center gap-4">
          <div
            className={
              'flex size-8 min-h-8 min-w-8 items-center justify-center rounded-sm'
            }
            style={{
              backgroundColor: `var(--${status.color}4)`
            }}>
            <Circle
              className={'size-5'}
              weight="regular"
              style={{
                color: `var(--${status.color}9)`
              }}
            />
          </div>
          <span className="font-medium">{status.name}</span>
          <span className="text-base-11 text-balance text-xs">
            {status.description ?? 'No description'}
          </span>
          <Button
            variant={'ghost'}
            size={'icon-sm'}
            onClick={() => {
              setEditStatus(true);
            }}>
            <Pencil className="size-4" />
          </Button>
        </div>
      ) : (
        <Form {...form}>
          <div className="flex-wrap-row flex flex-row items-center gap-4">
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem className="w-fit">
                  <FormControl>
                    <Popover>
                      <PopoverTrigger asChild>
                        <div
                          className={
                            'flex size-8 min-h-8 min-w-8 items-center justify-center rounded-sm'
                          }
                          style={{
                            backgroundColor: `var(--${field.value}4)`
                          }}>
                          <Circle
                            className={'size-5'}
                            weight="regular"
                            style={{
                              color: `var(--${field.value}9)`
                            }}
                          />
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="">
                        <div
                          className="flex flex-row flex-wrap gap-3"
                          style={{ padding: '0px' }}>
                          {uiColors.map((color) => (
                            <div
                              key={color}
                              className={`flex size-8 min-h-8 min-w-8 cursor-pointer items-center justify-center rounded-sm ${field.value === color ? `ring-base-9 ring-1 ring-offset-2` : ''}`}
                              style={{
                                backgroundColor: `var(--${color}4)`
                              }}
                              onClick={() => field.onChange(color)}>
                              {field.value === color ? (
                                <Check
                                  className={'size-5'}
                                  weight="regular"
                                  style={{
                                    color: `var(--${color}9)`
                                  }}
                                />
                              ) : (
                                <Circle
                                  className={'size-5'}
                                  weight="regular"
                                  style={{
                                    color: `var(--${color}9)`
                                  }}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="m-0 min-w-28 max-w-52">
                  <FormControl>
                    <Input
                      label="Name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="my-1 min-w-32 max-w-80">
                  <FormControl>
                    <Input
                      label="Description"
                      fullWidth
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              loading={isPending}
              variant={'secondary'}
              onClick={() => setEditStatus(false)}>
              Cancel
            </Button>
            <Button
              loading={isPending}
              onClick={form.handleSubmit(handleSubmit)}>
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </Form>
      )}
    </>
  );
}

function NewSpaceStatus({
  orgShortcode,
  spaceShortcode,
  showNewStatusComponent,
  type,
  order
}: {
  orgShortcode: string;
  spaceShortcode: string;
  type: SpaceStatus;
  order: number;
  showNewStatusComponent: (value: boolean) => void;
}) {
  const { mutateAsync: addNewSpaceStatus, isPending } =
    platform.spaces.statuses.addNewSpaceStatus.useMutation();

  const orgMemberSpacesQueryCache =
    platform.useUtils().spaces.getOrgMemberSpaces;
  const spaceStatusQueryCache =
    platform.useUtils().spaces.statuses.getSpacesStatuses;

  const newSpaceStatusFormSchema = z.object({
    name: z.string().min(1).max(32),
    description: z.string().min(0).max(128).optional(),
    color: z.enum(uiColors)
  });

  const form = useForm<z.infer<typeof newSpaceStatusFormSchema>>({
    resolver: zodResolver(newSpaceStatusFormSchema),
    defaultValues: {
      name: '',
      description: '',
      color: uiColors[Math.floor(Math.random() * uiColors.length)]
    }
  });

  const handleSubmit = async (
    values: z.infer<typeof newSpaceStatusFormSchema>
  ) => {
    await addNewSpaceStatus({
      orgShortcode: orgShortcode,
      spaceShortcode: spaceShortcode,
      type: type,
      name: values.name,
      description: values.description,
      color: values.color,
      order: order
    });

    showNewStatusComponent(false);
    await orgMemberSpacesQueryCache.invalidate();
    await spaceStatusQueryCache.invalidate();
    form.reset();
  };

  return (
    <>
      <Form {...form}>
        <div className="flex-wrap-row flex flex-row items-center gap-4">
          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem className="w-fit">
                <FormControl>
                  <Popover>
                    <PopoverTrigger asChild>
                      <div
                        className={
                          'flex size-8 min-h-8 min-w-8 items-center justify-center rounded-sm'
                        }
                        style={{
                          backgroundColor: `var(--${field.value}4)`
                        }}>
                        <Circle
                          className={'size-5'}
                          weight="regular"
                          style={{
                            color: `var(--${field.value}9)`
                          }}
                        />
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="">
                      <div
                        className="flex flex-row flex-wrap gap-3"
                        style={{ padding: '0px' }}>
                        {uiColors.map((color) => (
                          <div
                            key={color}
                            className={`flex size-8 min-h-8 min-w-8 cursor-pointer items-center justify-center rounded-sm ${field.value === color ? `ring-base-9 ring-1 ring-offset-2` : ''}`}
                            style={{
                              backgroundColor: `var(--${color}4)`
                            }}
                            onClick={() => field.onChange(color)}>
                            {field.value === color ? (
                              <Check
                                className={'size-5'}
                                weight="regular"
                                style={{
                                  color: `var(--${color}9)`
                                }}
                              />
                            ) : (
                              <Circle
                                className={'size-5'}
                                weight="regular"
                                style={{
                                  color: `var(--${color}9)`
                                }}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="m-0 min-w-28 max-w-52">
                <FormControl>
                  <Input
                    label="Name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="my-1 min-w-32 max-w-80">
                <FormControl>
                  <Input
                    label="Description"
                    fullWidth
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            loading={isPending}
            variant={'secondary'}
            onClick={() => showNewStatusComponent(false)}>
            Cancel
          </Button>
          <Button
            loading={isPending}
            onClick={form.handleSubmit(handleSubmit)}>
            {isPending ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </Form>
    </>
  );
}
