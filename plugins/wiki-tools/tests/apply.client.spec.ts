// @vitest-environment jsdom
/** wiki-tools browser half: knowledge-graph page type, guide card, no header button. */

import { Context } from '@deepseek-ai/cordis'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { SidebarRightTabDefinition } from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type { PropsRenderSlots } from '@deepseek-ai/dsh-client-ui-slots'
import { describe, expect, it, onTestFinished } from 'vitest'
import { apply, inject } from '../src/client/index.ts'
import { en, zh } from '../src/client/locales.ts'

const ID = 'dsh-wiki-tools'
const KIND = 'wiki-graph'

async function fixture() {
  const ctx = new Context()
  onTestFinished(async () => { await ctx.fiber.dispose() })
  ctx.provide('locale', new LocaleRuntime(ctx))
  const registered: SidebarRightTabDefinition[] = []
  ctx.provide('sidebarRightTabs', {
    register: (definition: SidebarRightTabDefinition) => {
      registered.push(definition)
      return () => {
        const index = registered.indexOf(definition)
        if (index >= 0) registered.splice(index, 1)
      }
    },
  })
  ctx.locale.setLocale('zh')
  await ctx.plugin(SlotRegistry).await()
  ctx.slots.register({
    name: 'root',
    children: {
      'conversation.session.header.utilities': { kind: 'list', scope: 'session' },
      'sidebar.right.pane.tab': {
        kind: 'keyed',
        scope: 'session',
        inject: { hooks: { tabInfo: () => { throw new Error('tab body is not rendered in this registration test') } } },
      },
    },
  }, (_props: PropsRenderSlots<'conversation.session.header.utilities' | 'sidebar.right.pane.tab'>) => null)
  return { ctx, registered }
}

describe('wiki-tools right Sidebar tab', () => {
  it('registers a knowledge-graph guide card and page kind without a session-header button', async () => {
    const { ctx, registered } = await fixture()
    expect(inject).toEqual(['slots', 'locale', 'sidebarRightTabs'])
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    const definition = registered.find(entry => entry.kind === KIND)
    expect(definition?.id).toBe(ID)
    expect(definition?.patterns).toBeUndefined()
    expect(definition?.title('')).toBe(zh['tab.title'])
    expect(definition?.guide?.map(entry => ({
      title: entry.title(),
      description: entry.description?.(),
    }))).toEqual([{
      title: zh['guide.title'],
      description: zh['guide.description'],
    }])
    expect(ctx.slots.entries('conversation.session.header.utilities')).toEqual([])
    expect(ctx.slots.entries('sidebar.right.pane.tab').map(entry => entry.options.key)).toEqual([ID])
    ctx.locale.setLocale('en')
    expect(definition?.title('')).toBe(en['tab.title'])
    expect(definition?.guide?.[0]?.title()).toBe(en['guide.title'])
    await fiber.dispose()
    expect(registered).toEqual([])
    expect(ctx.slots.entries('sidebar.right.pane.tab')).toEqual([])
  })
})
