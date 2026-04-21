"use client"

import { PDFDownloadLink, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import { Button } from "@/components/ui/button"

type InvoicePdfItem = {
  id: string
  description: string
  quantity: number
  rate: number
  tax_percent: number
  amount: number
}

type InvoicePdfProps = {
  invoiceNumber: string
  businessName: string
  businessEmail: string
  clientName: string
  clientEmail: string
  clientPhone: string
  dueDate: string
  notes: string
  subtotal: number
  gstAmount: number
  total: number
  items: InvoicePdfItem[]
}

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 11, fontFamily: "Helvetica", color: "#111827" },
  row: { flexDirection: "row", justifyContent: "space-between" },
  heading: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  muted: { color: "#6b7280" },
  section: { marginBottom: 16 },
  tableHead: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#d1d5db", paddingBottom: 6 },
  th: { fontWeight: 700, flex: 1 },
  td: { flex: 1, paddingVertical: 6, borderBottomWidth: 1, borderColor: "#e5e7eb" },
  right: { textAlign: "right" },
})

function currency(value: number) {
  return `Rs. ${value.toFixed(2)}`
}

function InvoicePdfDocument(props: InvoicePdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={[styles.row, styles.section]}>
          <View>
            <Text style={styles.heading}>{props.businessName || "My Business"}</Text>
            <Text style={styles.muted}>{props.businessEmail}</Text>
          </View>
          <View>
            <Text>Invoice: {props.invoiceNumber}</Text>
            <Text>Due: {props.dueDate || "-"}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={{ fontWeight: 700, marginBottom: 4 }}>Bill To</Text>
          <Text>{props.clientName}</Text>
          <Text style={styles.muted}>{props.clientEmail}</Text>
          <Text style={styles.muted}>{props.clientPhone}</Text>
        </View>

        <View style={styles.tableHead}>
          <Text style={styles.th}>Description</Text>
          <Text style={[styles.th, styles.right]}>Qty</Text>
          <Text style={[styles.th, styles.right]}>Rate</Text>
          <Text style={[styles.th, styles.right]}>GST%</Text>
          <Text style={[styles.th, styles.right]}>Amount</Text>
        </View>
        {props.items.map((item) => (
          <View key={item.id} style={{ flexDirection: "row" }}>
            <Text style={styles.td}>{item.description}</Text>
            <Text style={[styles.td, styles.right]}>{item.quantity.toFixed(2)}</Text>
            <Text style={[styles.td, styles.right]}>{currency(item.rate)}</Text>
            <Text style={[styles.td, styles.right]}>{item.tax_percent.toFixed(2)}</Text>
            <Text style={[styles.td, styles.right]}>{currency(item.amount)}</Text>
          </View>
        ))}

        <View style={{ marginTop: 16, alignSelf: "flex-end", minWidth: 220 }}>
          <View style={styles.row}>
            <Text style={styles.muted}>Subtotal</Text>
            <Text>{currency(props.subtotal)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.muted}>GST</Text>
            <Text>{currency(props.gstAmount)}</Text>
          </View>
          <View style={[styles.row, { marginTop: 6 }]}>
            <Text style={{ fontWeight: 700 }}>Total</Text>
            <Text style={{ fontWeight: 700 }}>{currency(props.total)}</Text>
          </View>
        </View>

        {props.notes ? (
          <View style={{ marginTop: 20 }}>
            <Text style={{ fontWeight: 700 }}>Notes</Text>
            <Text style={styles.muted}>{props.notes}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  )
}

export function InvoicePdfDownload(props: InvoicePdfProps) {
  return (
    <PDFDownloadLink
      document={<InvoicePdfDocument {...props} />}
      fileName={`${props.invoiceNumber}.pdf`}
      style={{ textDecoration: "none" }}
    >
      {({ loading }) => <Button type="button">{loading ? "Preparing PDF..." : "Download PDF"}</Button>}
    </PDFDownloadLink>
  )
}
