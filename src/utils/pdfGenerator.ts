import html2pdf from 'html2pdf.js';
import { format } from 'date-fns';
import type { Payslip } from '../services/payrollService';
import nrnstLogo from '../assets/nrnst-logo.png';

export const generatePayslipHtml = (
  payslip: Payslip,
  employeeData: any,
  user: any,
  officeLocation: any
): string => {
  const getMonthName = (month: number) => {
    const date = new Date();
    date.setMonth(month - 1);
    return format(date, "MMMM");
  };

  const allowances = payslip.items.filter((item) => item.type === "ALLOWANCE");
  const deductions = payslip.items.filter((item) => item.type === "DEDUCTION");
  const maxRows = Math.max(allowances.length, deductions.length);

  const employeeName = employeeData?.personalInfo
    ? `${employeeData.personalInfo.firstName} ${employeeData.personalInfo.lastName}`
    : (user ? `${user.firstName} ${user.lastName}` : "");
  const employeeIdStr =
    employeeData?.employeeId ||
    employeeData?.employment?.employeeId ||
    user?.employeeId ||
    "";
  const designation = employeeData?.employment?.designation?.name ||
    employeeData?.employment?.designation ||
    user?.designation ||
    "";
  const department = employeeData?.employment?.department?.name ||
    employeeData?.employment?.department ||
    user?.department ||
    "";
  const rawJoinDate =
    employeeData?.employment?.dateOfJoining ||
    employeeData?.employment?.joinDate ||
    user?.joinDate;
  const joinDate = rawJoinDate && !isNaN(new Date(rawJoinDate).getTime())
    ? format(new Date(rawJoinDate), "dd MMM yyyy")
    : "";
  const locationName = officeLocation?.name || employeeData?.employment?.location || "";
  const salaryConfigData = typeof payslip.salaryConfigId === "object" ? (payslip.salaryConfigId as any) : null;
  const bankName =
    employeeData?.employment?.bankName ||
    employeeData?.bankDetails?.bankName ||
    salaryConfigData?.bankName ||
    "";
  const bankAccount =
    employeeData?.employment?.bankAccountNo ||
    employeeData?.bankDetails?.accountNumber ||
    salaryConfigData?.bankAccountNo ||
    "";
  const ifscCode =
    employeeData?.employment?.ifscCode ||
    employeeData?.bankDetails?.ifscCode ||
    "";
  const panNumber =
    employeeData?.employment?.panNumber ||
    employeeData?.personalInfo?.panNumber ||
    "";
  const pfUan = employeeData?.employment?.uanNumber || "";

  const companyName = "NRNST TECH PRIVATE LIMITED";
  const companyAddress = officeLocation ?
    `${officeLocation.address.street}, ${officeLocation.address.city}, ${officeLocation.address.state} - ${officeLocation.address.zipCode}` :
    "";

  function numberToWords(num: number): string {
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    if (num === 0) return "Zero";

    const convert = (n: number): string => {
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "");
      if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " and " + convert(n % 100) : "");
      if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + convert(n % 1000) : "");
      return String(n);
    };

    return convert(num);
  }

  const tableRowsHtml = Array.from({ length: Math.max(maxRows, 5) }).map((_, i) => {
    const earn = allowances[i];
    const ded = deductions[i];
    const rowBg = i % 2 === 0 ? '#ffffff' : '#fafafa';
    return `
      <tr style="background-color: ${rowBg};">
        <td style="border-right: 1px solid #000; border-bottom: 1px solid #ddd; padding: 6px 10px;">${earn?.name || ""}</td>
        <td style="border-right: 1px solid #000; border-bottom: 1px solid #ddd; padding: 6px 10px; text-align: right;">${earn ? Math.round(earn.amount).toLocaleString() : ""}</td>
        <td style="border-right: 1px solid #000; border-bottom: 1px solid #ddd; padding: 6px 10px; text-align: right;">${earn ? Math.round(earn.amount).toLocaleString() : ""}</td>
        <td style="border-right: 1px solid #000; border-bottom: 1px solid #ddd; padding: 6px 10px;">${ded?.name || ""}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #ddd; text-align: right;">${ded ? Math.round(ded.amount).toLocaleString() : ""}</td>
      </tr>
    `;
  }).join('');

  const logoSrc = typeof window !== 'undefined'
    ? new URL(nrnstLogo, window.location.origin).href
    : nrnstLogo;

  return `
    <div style="font-family: Arial, sans-serif; font-size: 11px; color: #000; background-color: #fff; width: 100%; max-width: 780px; margin: 0 auto; padding: 10px;">
      <div style="border: 1px solid #000;">

        <!-- Header -->
        <div style="display: table; width: 100%; padding: 12px 14px; border-bottom: 1px solid #000; box-sizing: border-box;">
          <div style="display: table-cell; width: 130px; vertical-align: middle; text-align: left;">
            <img src="${logoSrc}" alt="NRNST Tech Logo" style="height: 50px; width: auto; max-width: 125px; object-fit: contain; display: block;" />
          </div>
          <div style="display: table-cell; vertical-align: middle; text-align: center; padding: 0 8px;">
            <div style="font-size: 18px; font-weight: bold; margin-bottom: 4px;">${companyName}</div>
            <div style="font-size: 10px; color: #444; margin-bottom: 8px;">${companyAddress}</div>
            <div style="font-weight: bold; font-size: 13px;">Payslip for the month of ${getMonthName(payslip.month)} ${payslip.year}</div>
          </div>
          <div style="display: table-cell; width: 130px;"></div>
        </div>

        <!-- Employee Details -->
        <div style="display: table; width: 100%; border-bottom: 1px solid #000; box-sizing: border-box;">
          <!-- Left Column -->
          <div style="display: table-cell; width: 50%; padding: 10px 12px; vertical-align: top;">
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
              <tr><td style="padding: 3px 0; width: 145px; color: #333;">Name:</td><td style="padding: 3px 0; font-weight: 600;">${employeeName}</td></tr>
              <tr><td style="padding: 3px 0; color: #333;">Joining Date:</td><td style="padding: 3px 0;">${joinDate}</td></tr>
              <tr><td style="padding: 3px 0; color: #333;">Designation:</td><td style="padding: 3px 0;">${designation}</td></tr>
              <tr><td style="padding: 3px 0; color: #333;">Department:</td><td style="padding: 3px 0;">${department}</td></tr>
              <tr><td style="padding: 3px 0; color: #333;">Location:</td><td style="padding: 3px 0;">${locationName}</td></tr>
              <tr><td style="padding: 3px 0; color: #333;">Effective Work Days:</td><td style="padding: 3px 0;">${payslip.daysWorked}</td></tr>
              <tr><td style="padding: 3px 0; color: #333;">LOP:</td><td style="padding: 3px 0;">${payslip.lopDays}</td></tr>
            </table>
          </div>
          <!-- Right Column -->
          <div style="display: table-cell; width: 50%; padding: 10px 12px; vertical-align: top; border-left: 1px solid #000;">
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
              <tr><td style="padding: 3px 0; width: 145px; color: #333;">Employee No:</td><td style="padding: 3px 0; font-weight: 600;">${employeeIdStr}</td></tr>
              <tr><td style="padding: 3px 0; color: #333;">Bank Name:</td><td style="padding: 3px 0;">${bankName}</td></tr>
              <tr><td style="padding: 3px 0; color: #333;">Bank Account No:</td><td style="padding: 3px 0;">${bankAccount}</td></tr>
              <tr><td style="padding: 3px 0; color: #333;">IFSC Code:</td><td style="padding: 3px 0;">${ifscCode}</td></tr>
              <tr><td style="padding: 3px 0; color: #333;">PAN Number:</td><td style="padding: 3px 0;">${panNumber}</td></tr>
              <tr><td style="padding: 3px 0; color: #333;">PF UAN:</td><td style="padding: 3px 0;">${pfUan}</td></tr>
            </table>
          </div>
        </div>

        <!-- Earnings / Deductions Table -->
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 6px 10px; text-align: left; font-weight: bold;">Earnings</th>
              <th style="border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 6px 10px; text-align: right; width: 70px; font-weight: bold;">Full</th>
              <th style="border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 6px 10px; text-align: right; width: 70px; font-weight: bold;">Actual</th>
              <th style="border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 6px 10px; text-align: left; font-weight: bold;">Deductions</th>
              <th style="border-bottom: 1px solid #000; padding: 6px 10px; text-align: right; width: 70px; font-weight: bold;">Actual</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
            <tr style="font-weight: bold; background-color: #f0f0f0;">
              <td style="border-top: 1px solid #000; border-right: 1px solid #000; padding: 6px 10px;">Total Earnings: INR.</td>
              <td style="border-top: 1px solid #000; border-right: 1px solid #000; padding: 6px 10px; text-align: right;">${Math.round(payslip.grossEarnings)}</td>
              <td style="border-top: 1px solid #000; border-right: 1px solid #000; padding: 6px 10px; text-align: right;">${Math.round(payslip.grossEarnings)}</td>
              <td style="border-top: 1px solid #000; border-right: 1px solid #000; padding: 6px 10px;">Total Deductions: INR.</td>
              <td style="border-top: 1px solid #000; padding: 6px 10px; text-align: right;">${Math.round(payslip.totalDeductions)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Net Pay -->
        <div style="padding: 8px 10px; border-top: 1px solid #000; border-bottom: 1px solid #000; font-size: 11px;">
          Net Pay for the month (Total Earnings - Total Deductions):
          <span style="font-weight: bold; margin-left: 12px; font-size: 12px;">₹${Math.round(payslip.netPay).toLocaleString()}</span>
        </div>

        <!-- Amount in Words -->
        <div style="padding: 7px 10px; border-bottom: 1px solid #000; font-style: italic; font-size: 11px; color: #333;">
          (Rupees ${numberToWords(Math.round(payslip.netPay))} Only)
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 10px; font-size: 10px; color: #555;">
          This is a system generated payslip and does not require signature.
        </div>
      </div>

      <!-- Print Date -->
      <div style="font-size: 9px; color: #666; margin-top: 12px;">
        Print Date: ${format(new Date(), "dd MMM yyyy, hh:mm a")}
      </div>
    </div>
  `;
};

export const downloadPayslipAsPDF = (
  payslip: Payslip,
  employeeData: any,
  user: any,
  officeLocation: any
) => {
  const htmlString = generatePayslipHtml(payslip, employeeData, user, officeLocation);

  const filename = `Payslip_${payslip.month}_${payslip.year}.pdf`;

  html2pdf().from(htmlString).set({
    margin: 10,
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).save();
};
