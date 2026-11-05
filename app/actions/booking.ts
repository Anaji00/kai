"use server";

import { z } from "zod";
import crypto from "crypto";
import { Resend } from "resend";
import nodemailer from "nodemailer";

// Guest input is untrusted: escape it before it reaches any HTML email.
function escapeHtml(value: string | undefined | null): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendEmailViaSmtp(options: {
  to: string[];
  subject: string;
  html: string;
  senderName: string;
}): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (!host || !user || !pass) {
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    const fromHeader = `"${options.senderName}" <${user}>`;
    await transporter.sendMail({
      from: fromHeader,
      to: options.to.join(", "),
      subject: options.subject,
      html: options.html,
    });
    console.log(`[SMTP Live] Dispatched email to ${options.to.join(", ")} via ${host} (From: ${fromHeader})`);
    return true;
  } catch (smtpErr) {
    console.error(`[SMTP Error] Failed sending to ${options.to.join(", ")} via ${host}:`, smtpErr);
    return false;
  }
}
import { BookingFormState } from "@/lib/types";
import { getRetreatById } from "@/lib/retreats";
import { backendOrigin } from "@/lib/backend-origin";

const FOUNDER_EMAILS = Array.from(
  new Set([
    process.env.KAREENA_ROUTING_EMAIL || "kareena@grandtravelcruise.com",
    process.env.ARMAAN_ROUTING_EMAIL || "armaan@grandtravelcruise.com",
  ].filter(Boolean))
);

const bookingSchema = z.object({
  fullName: z.string().min(2, "Please provide your full legal name").max(200, "Please shorten your name"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(7, "Please enter a valid contact phone number").max(40, "Please enter a valid contact phone number"),
  retreatId: z.string().min(1, "Please select a retreat sanctuary"),
  roomPreference: z.enum(["private-suite", "shared-luxury", "flexible"] as const, {
    message: "Please select a room preference",
  }),
  movementExperience: z.string().min(1, "Please indicate your movement experience"),
  healthNotes: z.string().max(5000, "Please keep notes under 5,000 characters").optional(),
  intentions: z.string().max(5000, "Please keep this under 5,000 characters").optional(),
  passportValid: z.string().optional(),
  waiverAccepted: z.literal("on", {
    message: "You must accept the Release of Liability & Assumption of Risk waiver to proceed",
  }),
  electronicSignature: z
    .string()
    .min(2, "Please type your full legal name as your binding electronic signature")
    .max(200, "Please shorten your signature"),
});

export async function submitBookingInquiry(
  prevState: BookingFormState | null,
  formData: FormData
): Promise<BookingFormState> {
  const rawData = {
    fullName: (formData.get("fullName") as string) || "",
    email: (formData.get("email") as string) || "",
    phone: (formData.get("phone") as string) || "",
    retreatId: (formData.get("retreatId") as string) || "puerto-vallarta-2027",
    roomPreference: (formData.get("roomPreference") as string) || "private-suite",
    movementExperience: (formData.get("movementExperience") as string) || "all-levels",
    healthNotes: (formData.get("healthNotes") as string) || "",
    intentions: (formData.get("intentions") as string) || "",
    passportValid: (formData.get("passportValid") as string) || "yes-valid-6mo",
    waiverAccepted: formData.get("waiverAccepted") as string,
    electronicSignature: ((formData.get("electronicSignature") as string) || "").trim(),
  };

  // Validate with Zod
  const validation = bookingSchema.safeParse(rawData);
  if (!validation.success) {
    const errorMap = validation.error.flatten().fieldErrors;
    return {
      success: false,
      message: "Please complete all required fields, including the Liability Waiver & Electronic Signature.",
      errors: errorMap,
    };
  }

  const data = validation.data;
  const backendUrl = backendOrigin();
  const bookingReference = `KAI-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const waiverSignedAt = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";

  // 1. Primary: Wire directly to FastAPI Backend & Database (dual founder routing)
  try {
    const apiRes = await fetch(`${backendUrl}/api/v1/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        waiverAccepted: true,
        clientReference: bookingReference,
      }),
      // Long enough for a serverless cold start. A timeout here can still mean the backend saved the
      // booking, so the fallback below reuses the same reference rather than minting a second one.
      signal: AbortSignal.timeout(20000),
    });
    if (apiRes.ok) {
      const resData = await apiRes.json();
      return {
        success: true,
        message: resData.message,
        bookingReference: resData.bookingReference,
        waiverSignedBy: resData.waiverSignedBy || data.electronicSignature,
        waiverSignedAt: resData.waiverSignedAt || waiverSignedAt,
        routedEmails: resData.routedEmails || FOUNDER_EMAILS,
      };
    }
  } catch (apiErr) {
    console.log("[FastAPI Backend unavailable, invoking resilient server action]:", apiErr);
  }

  // 2. Resilient Server Action Fallback
  const retreat = getRetreatById(data.retreatId);
  const retreatTitle = retreat ? `${retreat.title} (${retreat.destination})` : data.retreatId;
  const retreatDates = retreat ? retreat.dates : "January 28 – 31, 2027";
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmailAdmin =
    process.env.RESEND_FROM_EMAIL || "KAI Sanctuary Reservations <inquiries@kaiwellnessretreats.com>";
  const fromEmailConcierge =
    process.env.RESEND_CONCIERGE_FROM_EMAIL ||
    process.env.RESEND_FROM_EMAIL ||
    "KAI Concierge Desk <concierge@kaiwellnessretreats.com>";

  const resend = resendApiKey ? new Resend(resendApiKey) : null;
  const founderSubject = `[New KAI Inquiry] ${retreatTitle} - ${data.fullName} (${bookingReference})`;
  const guestSubject = `Your KAI Sanctuary Reservation Inquiry for ${retreatTitle} [Ref: ${bookingReference}]`;

  const adminHtml = `
      <div style="font-family: 'Georgia', serif; color: #2D3E35; max-width: 640px; margin: 0 auto; padding: 30px; background-color: #FAF7F2; border: 1px solid #E5DDD0; border-radius: 12px;">
        <h2 style="color: #2D3E35; border-bottom: 1px solid #E5DDD0; padding-bottom: 12px; margin-top: 0;">New Sanctuary Reservation Inquiry</h2>
        <p><strong>Routed To:</strong> kareena@grandtravelcruise.com &amp; armaan@grandtravelcruise.com</p>
        <p><strong>Reference:</strong> ${bookingReference}</p>
        <p><strong>Sanctuary:</strong> ${escapeHtml(retreatTitle)}</p>
        <p><strong>Dates:</strong> ${retreatDates}</p>
        <hr style="border: none; border-top: 1px solid #E5DDD0; margin: 20px 0;" />
        <h3 style="color: #5C6B5E;">Guest Details &amp; Electronic Liability Waiver:</h3>
        <p><strong>Name:</strong> ${escapeHtml(data.fullName)}</p>
        <p><strong>Email:</strong> <a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a></p>
        <p><strong>Phone:</strong> ${escapeHtml(data.phone)}</p>
        <p><strong>Room Preference:</strong> ${escapeHtml(data.roomPreference)}</p>
        <p><strong>Movement Experience:</strong> ${escapeHtml(data.movementExperience)}</p>
        <p><strong>Passport Status:</strong> ${escapeHtml(data.passportValid)}</p>
        <p><strong>Health &amp; Dietary Notes:</strong> ${escapeHtml(data.healthNotes) || "None specified"}</p>
        <p><strong>Intentions for Renewal:</strong> ${escapeHtml(data.intentions) || "None specified"}</p>
        <p><strong>Liability Waiver Electronic Signature:</strong> ${escapeHtml(data.electronicSignature)} (Signed ${waiverSignedAt})</p>
        <hr style="border: none; border-top: 1px solid #E5DDD0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #738475;">Sent from KAI Wellness Retreats Reservation Desk • Founded by Kareena Islam &amp; Armaan Islam</p>
      </div>
    `;

  const guestHtml = `
      <div style="font-family: 'Georgia', serif; color: #2D3E35; max-width: 640px; margin: 0 auto; padding: 40px; background-color: #FAF7F2; border: 1px solid #E5DDD0; border-radius: 16px; line-height: 1.6;">
        <div style="text-align: center; margin-bottom: 30px;">
          <span style="font-size: 24px; letter-spacing: 4px; text-transform: uppercase; color: #2D3E35; display: block;">K A I</span>
          <span style="font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #5C6B5E;">Wellness Retreats • Where Your Peace Within Can Blend With The Pieces Around</span>
        </div>
        
        <p style="font-size: 16px;">Dear ${escapeHtml(data.fullName)},</p>
        
        <p>Thank you for placing your trust in KAI Wellness Retreats. Your reservation inquiry for <strong>${escapeHtml(retreatTitle)}</strong> (${retreatDates}) has been delivered directly to <strong>Kareena Islam (kareena@grandtravelcruise.com)</strong> and <strong>Armaan Islam (armaan@grandtravelcruise.com)</strong>.</p>
        
        <div style="background-color: #F2ECE4; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #E5DDD0;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #5C6B5E; text-transform: uppercase; letter-spacing: 1px;"><strong>Reservation Inquiry Summary</strong></p>
          <p style="margin: 0; font-size: 15px;"><strong>Sanctuary:</strong> ${escapeHtml(retreatTitle)}</p>
          <p style="margin: 4px 0 0 0; font-size: 14px;"><strong>Reference Code:</strong> ${bookingReference}</p>
          <p style="margin: 4px 0 0 0; font-size: 14px;"><strong>Waiver E-Signed By:</strong> ${escapeHtml(data.electronicSignature)}</p>
        </div>
        
        <p>Over the next 24 to 48 hours, Kareena and Armaan (in partnership with Grand Travel &amp; Cruise) will reach out to coordinate your flight logistics, discuss your wellness preferences, and finalize your suite placement.</p>
        
        <p style="margin-top: 24px;">
          With gratitude and warm calm,<br />
          <strong>Kareena Islam, BSN, RN, RYT &amp; Armaan Islam</strong><br />
          <span style="font-size: 13px; color: #738475;">Co-Founders, KAI Wellness Retreats • Grand Travel &amp; Cruise</span>
        </p>
      </div>
    `;


  // Delivers through SMTP when configured, then Resend. The SDK returns API failures rather than throwing.
  const deliver = async (to: string[], subject: string, html: string, senderName: string, from: string): Promise<boolean> => {
    if (await sendEmailViaSmtp({ to, subject, html, senderName })) return true;
    if (!resend) return false;
    try {
      const res = await resend.emails.send({ from, to, subject, html });
      if (res.error) {
        console.error(`[Resend Error] Delivery to ${to.join(", ")} failed:`, res.error.message);
        return false;
      }
      console.log(`[Resend Live] Delivered to ${to.join(", ")} for ${bookingReference}`);
      return true;
    } catch (err: unknown) {
      console.error("[Resend Error]:", err instanceof Error ? err.message : err);
      return false;
    }
  };

  const hasTransport = Boolean(process.env.SMTP_HOST || resend);
  const isProduction = process.env.NODE_ENV === "production";

  if (!hasTransport && !isProduction) {
    console.log("[Simulated founder alert and guest confirmation]:", {
      to: FOUNDER_EMAILS,
      guest: data.email,
      bookingReference,
      retreatTitle,
    });
  }

  const founderDelivered = hasTransport
    ? await deliver(FOUNDER_EMAILS, founderSubject, adminHtml, "KAI Sanctuary Reservations", fromEmailAdmin)
    : !isProduction;

  // Reaching this point means the backend did not confirm the booking. If the founders were not told
  // either, nothing has recorded this inquiry, so the guest must hear that rather than a false success.
  if (!founderDelivered) {
    console.error("[CRITICAL] Booking inquiry could not be stored or delivered:", { bookingReference, retreatTitle });
    return {
      success: false,
      message:
        "We could not submit your inquiry just now. Please try again in a few minutes, or email kareena@grandtravelcruise.com directly.",
    };
  }

  if (hasTransport) {
    const guestDelivered = await deliver([data.email], guestSubject, guestHtml, "KAI Concierge Desk", fromEmailConcierge);
    if (!guestDelivered) {
      console.error(`[Email Error] Guest confirmation not delivered to ${data.email} for ${bookingReference}`);
    }
  }

  return {
    success: true,
    message: `Your reservation inquiry for ${retreatTitle} has been received and routed directly to kareena@grandtravelcruise.com & armaan@grandtravelcruise.com. Kareena and Armaan will personally reach out within 24–48 hours.`,
    bookingReference,
    waiverSignedBy: data.electronicSignature,
    waiverSignedAt,
    routedEmails: FOUNDER_EMAILS,
  };
}

const newsletterSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export async function subscribeNewsletter(
  prevState: { success: boolean; message: string } | null,
  formData: FormData
): Promise<{ success: boolean; message: string }> {
  const email = formData.get("email") as string;
  const validation = newsletterSchema.safeParse({ email });

  if (!validation.success) {
    return {
      success: false,
      message: "Please enter a valid email address.",
    };
  }

  const backendUrl = backendOrigin();

  try {
    const apiRes = await fetch(`${backendUrl}/api/v1/newsletter/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: validation.data.email, source: "footer" }),
      signal: AbortSignal.timeout(3000),
    });
    if (apiRes.ok) {
      const resData = await apiRes.json();
      return {
        success: true,
        message: resData.message,
      };
    }
  } catch (apiErr) {
    console.log("[FastAPI Backend unavailable for newsletter, falling back]:", apiErr);
  }

  const resendApiKey = process.env.RESEND_API_KEY;

  try {
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      await resend.emails.send({
        from: "KAI Wellness Circle <concierge@kaiwellnessretreats.com>",
        to: FOUNDER_EMAILS,
        subject: `New Private Circle Subscriber: ${validation.data.email}`,
        html: `
          <div style="font-family: serif; padding: 24px; color: #2D3E35;">
            <h2>New Private Circle Member</h2>
            <p><strong>Email:</strong> ${validation.data.email}</p>
            <p>Routed to kareena@grandtravelcruise.com &amp; armaan@grandtravelcruise.com.</p>
          </div>
        `,
      });
    } else {
      console.log("[Resend Simulated Newsletter Subscriber]:", validation.data.email);
    }

    return {
      success: true,
      message: "Thank you. You have been added to our private priority circle.",
    };
  } catch (err) {
    console.error("Newsletter subscription error:", err);
    return {
      success: false,
      message: "We encountered an error adding you to the circle. Please try again later.",
    };
  }
}
