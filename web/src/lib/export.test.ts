import { describe, expect, it } from 'vitest';
import { customersCsv, ordersCsv, summaryCsv } from './export';

describe('ordersCsv', () => {
  it('emits a header row and one row per order', () => {
    const out = ordersCsv([
      {
        id: 21,
        createdAt: new Date('2026-07-17T15:00:00.000Z'),
        orderType: 'PICKUP',
        status: 'PENDING',
        subtotal: 24,
        taxAmount: 3.12,
        total: 27.12,
        customerName: 'Ada',
        itemCount: 2,
      },
    ]);
    expect(out.split('\r\n')[0]).toBe('id,date,type,status,subtotal,tax,total,customer,items');
    expect(out).toContain('21,2026-07-17T15:00:00.000Z,PICKUP,PENDING,24.00,3.12,27.12,Ada,2');
  });
});

describe('customersCsv', () => {
  it('formats spend + dates and blanks a missing last order', () => {
    const out = customersCsv([
      {
        name: 'Bob',
        phone: '+14165550222',
        email: null,
        orders: 3,
        spend: 45.5,
        lastOrderAt: new Date('2026-07-17T00:00:00.000Z'),
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
      },
      {
        name: 'Never',
        phone: null,
        email: 'x@y.com',
        orders: 0,
        spend: 0,
        lastOrderAt: null,
        createdAt: new Date('2026-06-02T00:00:00.000Z'),
      },
    ]);
    expect(out.split('\r\n')[0]).toBe('name,phone,email,orders,total_spend,last_order,first_seen');
    expect(out).toContain('Bob,+14165550222,,3,45.50,2026-07-17T00:00:00.000Z,2026-06-01T00:00:00.000Z');
    // Missing last order → blank cell.
    expect(out).toContain('Never,,x@y.com,0,0.00,,2026-06-02T00:00:00.000Z');
  });
});

describe('summaryCsv', () => {
  it('includes labeled sections for KPIs and each breakdown', () => {
    const out = summaryCsv({
      range: { from: '2026-07-01', to: '2026-07-31' },
      summary: { revenue: 100, taxCollected: 13, orders: 5, avgOrder: 20, itemsSold: 12 },
      byDay: [{ day: '2026-07-17', revenue: 100, tax: 13, total: 113, orders: 5 }],
      byType: [{ orderType: 'PICKUP', orders: 5, revenue: 100, tax: 13, total: 113 }],
      byMethod: [{ method: 'CARD', count: 5, amount: 113, tax: 13 }],
      topItems: [{ name: 'Pizza', quantity: 5, revenue: 100 }],
      topCategories: [{ name: 'Mains', quantity: 5, revenue: 100 }],
      topCustomers: [{ name: 'Ada', orders: 5, spend: 113 }],
    });
    expect(out).toContain('Sales summary,2026-07-01 to 2026-07-31');
    expect(out).toContain('metric,value');
    expect(out).toContain('Net revenue,100.00');
    expect(out).toContain('day,orders,revenue,tax,total');
    expect(out).toContain('order_type,orders,revenue,tax,total');
    expect(out).toContain('payment_method,count,amount,tax');
    expect(out).toContain('top_item,quantity,revenue');
    expect(out).toContain('top_customer,orders,spend');
    expect(out).toContain('Ada,5,113.00');
  });
});
