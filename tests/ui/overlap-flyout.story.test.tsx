import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import OverlapFlyout from '@/components/overlap-flyout'

const sampleItems = Array.from({ length: 3 }).map((_, i) => ({
  incident_id: `RG2400${i}`,
  call_type: ['Armed Robbery','Traffic Collision','Suspicious Activity'][i % 3],
  call_category: 'other',
  priority: [10,50,80][i % 3],
  received_at: new Date().toISOString(),
  address_raw: '123 MAIN ST',
  area: 'RIVERSIDE',
  disposition: 'Active',
  lat: 33.9533,
  lon: -117.3962,
}))

describe('OverlapFlyout (storybook)', () => {
  it('renders primary state', () => {
    const { container } = render(
      <div style={{ position:'relative', width: 320, height: 240 }}>
        <OverlapFlyout
          items={sampleItems}
          lat={33.9533}
          lon={-117.3962}
          anchor={{ x: 100, y: 90 }}
          onSelect={() => {}}
          onClose={() => {}}
        />
      </div>
    )
    expect(container).toMatchSnapshot()
  })
})

