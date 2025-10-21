import type { Meta, StoryObj } from '@storybook/react'
import OverlapFlyout from './overlap-flyout'

const meta: Meta<typeof OverlapFlyout> = {
  title: 'Map/OverlapFlyout',
  component: OverlapFlyout,
  parameters: { layout: 'centered' },
}

export default meta
type Story = StoryObj<typeof OverlapFlyout>

const sampleItems = Array.from({ length: 5 }).map((_, i) => ({
  incident_id: `RG2400${100 + i}`,
  call_type: ['Armed Robbery','Traffic Collision','Suspicious Activity','Burglary','Disturbance'][i % 5],
  call_category: 'other',
  priority: [10,30,50,70,90][i % 5],
  received_at: new Date().toISOString(),
  address_raw: '123 MAIN ST',
  area: 'RIVERSIDE',
  disposition: 'Active',
  lat: 33.9533,
  lon: -117.3962,
}))

export const Primary: Story = {
  args: {
    items: sampleItems,
    lat: 33.9533,
    lon: -117.3962,
    anchor: { x: 100, y: 80 },
    onSelect: () => {},
    onClose: () => {},
  },
}

