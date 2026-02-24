import express from 'express';
import { sequelize } from '../db.js';
import { ServiceCenter } from '../models/index.js';
import { DataTypes } from 'sequelize';

const router = express.Router();

// GET /api/monthly-claims/invoice?year=2024&month=02&centerId=1&complaints=5&invoiceNumber=INV001&invoiceDate=2025-12-01
router.get('/invoice', async (req, res) => {
  try {
    const { year, month, centerId, complaints, invoiceNumber, invoiceDate } = req.query;

    if (!year || !month) {
      return res.status(400).json({ error: 'year and month are required' });
    }

    if (!centerId) {
      return res.status(400).json({ error: 'centerId is required' });
    }

    // Accept manual complaint count or compute from DB
    let closedCount = 0;
    if (complaints) {
      closedCount = parseInt(complaints, 10);
    } else {
      // Query DB for closed complaints in this month for this center
      const start = `${year}-${month}-01`;
      const sql = `
        DECLARE @startDate DATETIME = :startDate;
        DECLARE @endDate DATETIME = DATEADD(MONTH, 1, @startDate);

        SELECT COUNT(*) AS closedCount
        FROM ComplaintRegistration
        WHERE CreatedAt >= @startDate
          AND CreatedAt < @endDate
          AND CallStatus IN ('Closed', 'Resolved', 'Completed')
          AND AssignedCenterId = :centerId
      `;

      const [result] = await sequelize.query(sql, {
        replacements: { startDate: start, centerId: parseInt(centerId, 10) },
        type: sequelize.QueryTypes.SELECT,
      });

      closedCount = (result && result.closedCount) ? parseInt(result.closedCount, 10) : 0;
    }

    // Business rule: amount per closed call (change as required)
    const ratePerCall = 75; // example rate
    const amount = closedCount * ratePerCall;

    // Fetch service center and branch details from DB
    let scName = '';
    let scAddress = '';
    let scPhone = '';
    let branchLocation = '';
    let branchGst = '27AAACF2637D1Z0';

    try {
      const sc = await ServiceCenter.findByPk(parseInt(centerId, 10));
      if (sc) {
        scName = sc.CenterName || '';
        scAddress = [sc.Address, sc.City, sc.State, sc.PinCode].filter(Boolean).join(', ') || '';
        scPhone = sc.Phone || '';
        // branchLocation and branchGst remain with defaults
      }
    } catch (e) {
      console.warn('Failed to load ServiceCenter:', e && e.message ? e.message : e);
    }

    // Use provided invoiceDate or default to today
    const finalInvoiceDate = invoiceDate || new Date().toISOString().split('T')[0];

    const invoice = {
      asfName: 'M/s. ADINATH ENTERPRISES',
      asfAddress: 'EKTA COLONY, GANESH NAGAR, THERGAON, MULSHI, PUNE - 411027\nPune Maharashtra, 411027',
      stateCode: '27',
      pan: 'CULPK9705P',
      gst: '-',
      email: 'shubhamkhot34@gmail.com',
      contact: '8892931008',
      vendorToLine1: scName,
      vendorTo: `${scName}\n${scAddress}`,
      scPhone: scPhone,
      branchLocation: branchLocation,
      branchGst,
      vendorCode: '8000891',
      invoiceNo: invoiceNumber || '',
      invoiceDate: finalInvoiceDate,
      billPeriod: `December'${year}`,
      items: [
        { sno: 1, description: 'Water Heater(Service)', complaints: closedCount, amount }
      ],
      totals: {
        total: amount,
        approved: 0,
        sgst: 0,
        cgst: 0,
        igst: 0,
        grandTotal: amount,
      },
      amountInWords: amount === 0 ? 'Zero' : '',
      terms: null,
      actions: [],
    };

    res.json(invoice);
  } catch (err) {
    console.error('monthlyClaims/invoice error:', err && err.message ? err.message : err);
    res.status(500).json({ error: 'Failed to compute invoice' });
  }
});

export default router;
