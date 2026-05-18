import 'server-only'
import React from 'react'
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from '@react-pdf/renderer'
import type { InvoiceDetail } from '@/lib/repositories/invoices.repo'
import type { CustomerRow } from '@/lib/repositories/customers.repo'
import type { InvoiceSettingsRow } from '@/lib/repositories/invoice-settings.repo'

Font.registerHyphenationCallback((word) => [word])

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, color: '#111827' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  logo: { width: 72, height: 72, objectFit: 'contain' },
  title: { fontSize: 22, fontWeight: 700 },
  section: { marginBottom: 16 },
  label: { fontSize: 9, color: '#6b7280', marginBottom: 2, textTransform: 'uppercase' },
  text: { fontSize: 10, lineHeight: 1.4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  table: { marginTop: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cell: { paddingVertical: 6, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: '#e5e7eb' },
  cellLast: { borderRightWidth: 0 },
  colDescription: { width: '52%' },
  colQty: { width: '12%', textAlign: 'right' },
  colUnit: { width: '18%', textAlign: 'right' },
  colSubtotal: { width: '18%', textAlign: 'right' },
  totals: { marginTop: 12, marginLeft: 'auto', width: 220, borderWidth: 1, borderColor: '#e5e7eb', padding: 8 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  totalStrong: { fontWeight: 700 },
  footer: { marginTop: 18, fontSize: 9, color: '#6b7280' },
})

const formatMoney = (amount: number) =>
  amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

const safeDate = (value: string | null) => (value ? new Date(value).toLocaleDateString('en-US') : '—')

interface InvoicePdfProps {
  invoice: InvoiceDetail
  customer: CustomerRow
  settings: InvoiceSettingsRow
}

function InvoicePdfDocument({ invoice, customer, settings }: InvoicePdfProps) {
  return (
    <Document title={`Invoice ${invoice.invoice_number}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>INVOICE</Text>
            <Text style={styles.text}>{invoice.invoice_number}</Text>
          </View>
          {settings.company_logo_url ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={settings.company_logo_url} style={styles.logo} />
          ) : null}
        </View>

        <View style={[styles.row, styles.section]}>
          <View style={{ width: '48%' }}>
            <Text style={styles.label}>From</Text>
            <Text style={styles.text}>{settings.company_name}</Text>
            {settings.company_address ? <Text style={styles.text}>{settings.company_address}</Text> : null}
            {settings.sender_email ? <Text style={styles.text}>{settings.sender_email}</Text> : null}
          </View>
          <View style={{ width: '48%' }}>
            <Text style={styles.label}>Bill to</Text>
            <Text style={styles.text}>{customer.name}</Text>
            {customer.dba_name ? <Text style={styles.text}>{customer.dba_name}</Text> : null}
            {customer.billing_email ? <Text style={styles.text}>{customer.billing_email}</Text> : null}
            {customer.address_line1 ? <Text style={styles.text}>{customer.address_line1}</Text> : null}
            {customer.address_line2 ? <Text style={styles.text}>{customer.address_line2}</Text> : null}
            {customer.city || customer.state_code || customer.zip ? (
              <Text style={styles.text}>
                {[customer.city, customer.state_code, customer.zip].filter(Boolean).join(', ')}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={[styles.row, styles.section]}>
          <View>
            <Text style={styles.label}>Issue date</Text>
            <Text style={styles.text}>{safeDate(invoice.issue_date)}</Text>
          </View>
          <View>
            <Text style={styles.label}>Due date</Text>
            <Text style={styles.text}>{safeDate(invoice.due_date)}</Text>
          </View>
          <View>
            <Text style={styles.label}>Status</Text>
            <Text style={styles.text}>{invoice.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.cell, styles.colDescription]}>Description</Text>
            <Text style={[styles.cell, styles.colQty]}>Qty</Text>
            <Text style={[styles.cell, styles.colUnit]}>Unit Price</Text>
            <Text style={[styles.cell, styles.cellLast, styles.colSubtotal]}>Subtotal</Text>
          </View>
          {invoice.invoice_line_items.map((item) => (
            <View key={item.id} style={styles.tableHeader}>
              <Text style={[styles.cell, styles.colDescription]}>{item.description}</Text>
              <Text style={[styles.cell, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.cell, styles.colUnit]}>{formatMoney(item.unit_price)}</Text>
              <Text style={[styles.cell, styles.cellLast, styles.colSubtotal]}>{formatMoney(item.subtotal)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalsRow}>
            <Text>Subtotal</Text>
            <Text>{formatMoney(invoice.subtotal)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>Tax</Text>
            <Text>{formatMoney(invoice.tax)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalStrong}>Total</Text>
            <Text style={styles.totalStrong}>{formatMoney(invoice.total_amount)}</Text>
          </View>
        </View>

        {invoice.notes ? (
          <View style={styles.footer}>
            <Text style={styles.label}>Notes</Text>
            <Text>{invoice.notes}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  )
}

export async function renderInvoicePdf(args: InvoicePdfProps): Promise<Buffer> {
  return renderToBuffer(<InvoicePdfDocument {...args} />)
}
