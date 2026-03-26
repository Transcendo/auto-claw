import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  EditorDialog,
  EntityCard,
  EntityGrid,
  SingleSelectField,
} from '@/components/config-builder'
import { buildDefaultValue, getNextEntryKey } from '../../utils'
import {
  getChannelAccounts,
  getChannels,
  setChannelAccounts,
  summarizeAccount,
  summarizeChannel,
} from '../lib/channels-editor'
import { asObject } from '../lib/value-readers'
import { useChannelsEditor } from './channels-context'

export function ChannelsBuilder() {
  const navigate = useNavigate()
  const {
    value,
    onChange,
    onSave,
    isSaving,
    knownChannelKeys,
    getChannelSchema,
    getAccountSchema,
  } = useChannelsEditor()
  const rootValue = getChannels(value)
  const configuredKeys = Object.keys(rootValue)
  const orderedChannelKeys = [
    ...knownChannelKeys.filter((key) => key in rootValue),
    ...configuredKeys.filter((key) => !knownChannelKeys.includes(key)),
  ]
  const addableChannelKeys = knownChannelKeys.filter((key) => !(key in rootValue))
  const [selectedChannelId, setSelectedChannelId] = useState(
    orderedChannelKeys[0] ?? ''
  )
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [pendingChannelId, setPendingChannelId] = useState('')
  const activeChannelId =
    selectedChannelId && selectedChannelId in rootValue
      ? selectedChannelId
      : (orderedChannelKeys[0] ?? '')
  const activeChannel = asObject(rootValue[activeChannelId])
  const activeSummary = activeChannelId
    ? summarizeChannel(activeChannelId, activeChannel)
    : null

  const addChannel = async (channelId: string) => {
    const channelSchema = getChannelSchema(channelId)
    const nextValue = {
      ...rootValue,
      [channelId]: asObject(buildDefaultValue(channelSchema)),
    }

    onChange(nextValue)
    setSelectedChannelId(channelId)
    const saved = await onSave(nextValue)
    if (!saved) {
      onChange(rootValue)
      setSelectedChannelId(activeChannelId)
      return false
    }

    void navigate({
      to: '/channels/channel/$channelId',
      params: { channelId },
    })
    return true
  }

  const addAccount = async () => {
    if (!activeChannelId) {
      return
    }

    const accountSchema = getAccountSchema(activeChannelId)
    if (!accountSchema) {
      return
    }

    const nextAccountId = getNextEntryKey(
      `channels.${activeChannelId}.accounts`,
      getChannelAccounts(activeChannel)
    )

    const nextValue = {
      ...rootValue,
      [activeChannelId]: setChannelAccounts(activeChannel, {
        ...getChannelAccounts(activeChannel),
        [nextAccountId]: asObject(buildDefaultValue(accountSchema)),
      }),
    }

    onChange(nextValue)
    const saved = await onSave(nextValue)
    if (!saved) {
      onChange(rootValue)
      return
    }

    void navigate({
      to: '/channels/channel/$channelId/account/$accountId',
      params: {
        channelId: activeChannelId,
        accountId: nextAccountId,
      },
    })
  }

  const removeActiveChannel = async () => {
    if (!activeChannelId) {
      return
    }

    const nextValue = {
      ...rootValue,
    }
    delete nextValue[activeChannelId]
    onChange(nextValue)
    const saved = await onSave(nextValue)
    if (!saved) {
      onChange(rootValue)
      return
    }

    void navigate({ to: '/channels' })
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='space-y-1'>
          <h2 className='text-lg font-semibold tracking-tight'>Channels</h2>
          <p className='text-sm text-muted-foreground'>
            Switch tabs to browse channel providers, then jump into detail pages
            for provider and account settings.
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          {addableChannelKeys.length > 0 && (
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                setPendingChannelId(addableChannelKeys[0] ?? '')
                setCreateDialogOpen(true)
              }}
              disabled={isSaving}
            >
              Add Channel
            </Button>
          )}
        </div>
      </div>

      {orderedChannelKeys.length === 0 ? (
        <EntityGrid
          emptyTitle='No channels yet'
          emptyDescription='Add a known channel provider to start editing.'
        />
      ) : (
        <div className='space-y-5'>
          <Tabs value={activeChannelId} onValueChange={setSelectedChannelId}>
            <TabsList className='w-full justify-start overflow-x-auto'>
              {orderedChannelKeys.map((channelId) => (
                <TabsTrigger
                  key={channelId}
                  value={channelId}
                  className='flex-none'
                >
                  {channelId}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {activeChannelId && activeSummary && (
            <div className='space-y-5 rounded-2xl border border-border/60 bg-background/80 p-4 sm:p-5'>
              <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                <div className='space-y-1'>
                  <h3 className='text-lg font-semibold'>{activeSummary.title}</h3>
                  <p className='text-sm text-muted-foreground'>
                    {activeSummary.subtitle}
                  </p>
                  {activeSummary.meta.length > 0 && (
                    <p className='text-xs text-muted-foreground'>
                      {activeSummary.meta.join(' · ')}
                    </p>
                  )}
                </div>
                <div className='flex flex-wrap items-center gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() =>
                      navigate({
                        to: '/channels/channel/$channelId',
                        params: { channelId: activeChannelId },
                      })
                    }
                  >
                    Edit Channel
                  </Button>
                  {getAccountSchema(activeChannelId) && (
                    <Button type='button' onClick={addAccount}>
                      Add Account
                    </Button>
                  )}
                  <Button
                    type='button'
                    variant='ghost'
                    onClick={() => void removeActiveChannel()}
                    disabled={isSaving}
                  >
                    Remove Channel
                  </Button>
                </div>
              </div>

              <EntityGrid
                emptyTitle='No accounts yet'
                emptyDescription='Add an account inside the current channel provider.'
              >
                {Object.entries(getChannelAccounts(activeChannel)).map(
                  ([accountId, accountValue]) => {
                    const accountSummary = summarizeAccount(
                      accountId,
                      accountValue,
                      typeof activeChannel.defaultAccount === 'string'
                        ? activeChannel.defaultAccount
                        : undefined
                    )

                    return (
                      <EntityCard
                        key={`${activeChannelId}-${accountId}`}
                        title={accountSummary.title}
                        subtitle={accountSummary.subtitle}
                        badges={accountSummary.badges.map((label) => ({
                          label,
                        }))}
                        onClick={() =>
                          navigate({
                            to: '/channels/channel/$channelId/account/$accountId',
                            params: {
                              channelId: activeChannelId,
                              accountId,
                            },
                          })
                        }
                        actions={
                          <>
                            <Button
                              type='button'
                              size='sm'
                              variant='outline'
                              onClick={() =>
                                navigate({
                                  to: '/channels/channel/$channelId/account/$accountId',
                                  params: {
                                    channelId: activeChannelId,
                                    accountId,
                                  },
                                })
                              }
                            >
                              Details
                            </Button>
                            <Button
                              type='button'
                              size='sm'
                              variant='ghost'
                              onClick={async () => {
                                const nextAccounts = {
                                  ...getChannelAccounts(activeChannel),
                                }
                                delete nextAccounts[accountId]
                                const nextValue = {
                                  ...rootValue,
                                  [activeChannelId]: setChannelAccounts(
                                    activeChannel,
                                    nextAccounts
                                  ),
                                }
                                onChange(nextValue)
                                const saved = await onSave(nextValue)
                                if (!saved) {
                                  onChange(rootValue)
                                }
                              }}
                              disabled={isSaving}
                            >
                              Remove
                            </Button>
                          </>
                        }
                      />
                    )
                  }
                )}
              </EntityGrid>
            </div>
          )}
        </div>
      )}

      <EditorDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        title='Add Channel'
        description='Pick a channel provider to add it to the current draft.'
        size='lg'
        footer={
          <>
            <Button
              type='button'
              variant='outline'
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type='button'
              disabled={!pendingChannelId || isSaving}
              onClick={async () => {
                if (!pendingChannelId) {
                  return
                }

                const saved = await addChannel(pendingChannelId)
                if (saved) {
                  setCreateDialogOpen(false)
                }
              }}
            >
              {isSaving ? 'Saving...' : 'Add'}
            </Button>
          </>
        }
      >
        <SingleSelectField
          options={addableChannelKeys.map((channelId) => ({
            label: channelId,
            value: channelId,
          }))}
          value={pendingChannelId}
          onChange={setPendingChannelId}
          placeholder='Select a channel'
        />
      </EditorDialog>
    </div>
  )
}
