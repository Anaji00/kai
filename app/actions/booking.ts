"use server";

import { z } from "zod";
import crypto from "crypto";
import { Resend } from "resend";
import { BookingFormState } from "@/lib/types";
import { getRetreatById } from "@/lib/retreats";

const bookingSchema = z.object({
  fullName: z.string().min(2, "Please provide your full legal name"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(7, "Please enter a valid contact phone number"),
  retreatId: z.string().min(1, "Please select a retreat sanctuary"),
  roomPreference: z.enum(["private-suite", "shared-luxury", "flexible"] as const, {
    message: "Please select a room preference",
  }),
  movementExperience: z.string().min(1, "Please indicate your movement experience"),
  healthNotes: z.string().optional(),
  intentions: z.string().optional(),
  passportValid: z.string().optional(),
});

export async function submitBookingInquiry(
  prevState: BookingFormState | null,
  formData: FormData
): Promise<BookingFormState> {
  const rawData = {
    fullName: formData.get("fullName") as string,
    email: formData.get("email") as string,
    phone: formData.get("phone") as string,
    retreatId: formData.get("retreatId") as string,
    roomPreference: formData.get("roomPreference") as string,
    movementExperience: formData.get("movementExperience") as string,
    healthNotes: (formData.get("healthNotes") as string) || "",
    intentions: (formData.get("intentions") as string) || "",
    passportValid: (formData.get("passportValid") as string) || "yes",
  };

  // Validate with Zod
  const validation = bookingSchema.safeParse(rawData);
  if (!validation.success) {
    const errorMap = validation.error.flatten().fieldErrors;
    return {
      success: false,
      message: "Please correct the highlighted items to continue.",
      errors: errorMap,
    };
  }

  const data = validation.data;
  const backendUrl = process.env.FASTAPI_BACKEND_URL || "http://127.0.0.1:8000";

  // 1. Primary: Wire directly to FastAPI Backend & Database
  try {
    const apiRes = await fetch(`${backendUrl}/api/v1/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(3000),
    });
    if (apiRes.ok) {
      const resData = await apiRes.json();
      return {
        success: true,
        message: resData.message,
        bookingReference: resData.bookingReference,
      };
    }
  } catch (apiErr) {
    console.log("[FastAPI Backend unavailable, invoking resilient server action fallback]:", apiErr);
  }

  // 2. Resilient Server Action Fallback
  const retreat = getRetreatById(data.retreatId);
  const retreatTitle = retreat ? `${retreat.title} (${retreat.destination})` : data.retreatId;
  const retreatDates = retreat ? retreat.dates : "Custom Curation";
  const bookingReference = `KAI-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

  const adminEmail = process.env.KAREENA_ROUTING_EMAIL || "kareena@kaiwellnessretreats.com";
  const resendApiKey = process.env.RESEND_API_KEY;

  try {
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);

      // 1. Internal Alert Email to Kareena
      await resend.emails.send({
        from: "KAI Sanctuary Reservations <inquiries@kaiwellnessretreats.com>",
        to: [adminEmail],
        subject: `[New Reservation Inquiry] ${retreatTitle} - ${data.fullName} (${bookingReference})`,
        html: `
          <div style="font-family: 'Georgia', serif; color: #2D3E35; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #FAF7F2; border: 1px solid #E5DDD0; border-radius: 12px;">
            <h2 style="color: #2D3E35; border-bottom: 1px solid #E5DDD0; padding-bottom: 12px; margin-top: 0;">New Sanctuary Reservation Inquiry</h2>
            <p><strong>Reference:</strong> ${bookingReference}</p>
            <p><strong>Sanctuary:</strong> ${retreatTitle}</p>
            <p><strong>Dates:</strong> ${retreatDates}</p>
            <hr style="border: none; border-top: 1px solid #E5DDD0; margin: 20px 0;" />
            <h3 style="color: #5C6B5E;">Guest Details:</h3>
            <p><strong>Name:</strong> ${data.fullName}</p>
            <p><strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a></p>
            <p><strong>Phone:</strong> ${data.phone}</p>
            <p><strong>Room Preference:</strong> ${data.roomPreference}</p>
            <p><strong>Movement Experience:</strong> ${data.movementExperience}</p>
            <p><strong>Passport Status:</strong> ${data.passportValid}</p>
            <p><strong>Health & Dietary Notes:</strong> ${data.healthNotes || "None specified"}</p>
            <p><strong>Intentions for Renewal:</strong> ${data.intentions || "None specified"}</p>
            <hr style="border: none; border-top: 1px solid #E5DDD0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #738475;">Sent from KAI Wellness Retreats Reservation Engine • Founded by Kareena Islam</p>
          </div>
        `,
      });

      // 2. Guest Confirmation Email
      await resend.emails.send({
        from: "Kareena Islam | KAI Retreats <concierge@kaiwellnessretreats.com>",
        to: [data.email],
        subject: `Your Sanctuary Inquiry for ${retreatTitle} [Ref: ${bookingReference}]`,
        html: `
          <div style="font-family: 'Georgia', serif; color: #2D3E35; max-width: 600px; margin: 0 auto; padding: 40px; background-color: #FAF7F2; border: 1px solid #E5DDD0; border-radius: 16px; line-height: 1.6;">
            <div style="text-align: center; margin-bottom: 30px;">
              <span style="font-size: 24px; letter-spacing: 4px; text-transform: uppercase; color: #2D3E35; display: block;">K A I</span>
              <span style="font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #5C6B5E;">Wellness Retreats</span>
            </div>
            
            <p style="font-size: 16px;">Dear ${data.fullName},</p>
            
            <p>Thank you for placing your trust in KAI. Your reservation inquiry for <strong>${retreatTitle}</strong> (${retreatDates}) has been received with warmth and intention.</p>
            
            <div style="background-color: #F2ECE4; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #E5DDD0;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #5C6B5E; text-transform: uppercase; letter-spacing: 1px;"><strong>Reservation In-Progress</strong></p>
              <p style="margin: 0; font-size: 15px;"><strong>Sanctuary:</strong> ${retreatTitle}</p>
              <p style="margin: 4px 0 0 0; font-size: 14px;"><strong>Reference Code:</strong> ${bookingReference}</p>
              <p style="margin: 4px 0 0 0; font-size: 14px;"><strong>Room Tier:</strong> ${data.roomPreference.replace("-", " ").toUpperCase()}</p>
            </div>
            
            <p>Because each KAI sanctuary is intentionally capped at 12 to 14 guests, I personally curate every cohort to ensure harmony, safety, and a restorative somatic environment.</p>
            
            <p>Over the next 24 to 48 hours, our team (in partnership with Grand Travel & Cruise) will review your intake details and reach out directly to coordinate your flight logistics, answer any clinical questions, and finalize your placement.</p>
            
            <p style="margin-top: 30px; font-style: italic; color: #5C6B5E;">
              &ldquo;Kai means renewal in Japanese. A return to balance. To presence. To yourself.&rdquo;
            </p>
            
            <p style="margin-top: 24px;">
              With gratitude and warm calm,<br />
              <strong>Kareena Islam</strong><br />
              <span style="font-size: 13px; color: #738475;">Founder & Clinical Director, KAI Wellness Retreats<br />Grand Travel & Cruise Luxury Advisor</span>
            </p>
          </div>
        `,
      });
    } else if (process.env.NODE_ENV === "production") {
      console.error("[CRITICAL] Booking inquiry received while FastAPI backend and Resend are unavailable:", {
        bookingReference,
        retreatTitle,
        guestEmail: data.email,
      });
      return {
        success: false,
        message: "Our sanctuary booking service is currently synchronizing. Please email concierge@kaiwellnessretreats.com directly so we may secure your sanctuary placement immediately.",
      };
    } else {
      // Graceful local logging for development without api keys
      console.log("[Resend Simulated Alert to Kareena]:", {
        to: adminEmail,
        bookingReference,
        retreatTitle,
        guest: data,
      });
      console.log("[Resend Simulated Guest Confirmation]:", {
        to: data.email,
        retreatTitle,
        bookingReference,
      });
    }

    return {
      success: true,
      message: `Your reservation inquiry for ${retreatTitle} has been received. Kareena personally curates each intimate cohort and will be in touch within 24–48 hours.`,
      bookingReference,
    };
  } catch (error) {
    console.error("Booking submission error:", error);
    return {
      success: false,
      message: "We encountered an unexpected error submitting your reservation. Please try again or reach out directly to concierge@kaiwellnessretreats.com.",
    };
  }
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

  const backendUrl = process.env.FASTAPI_BACKEND_URL || "http://127.0.0.1:8000";

  // 1. Primary: Wire to FastAPI Backend
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

  // 2. Resilient Server Action Fallback
  const resendApiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.KAREENA_ROUTING_EMAIL || "kareena@kaiwellnessretreats.com";

  try {
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      await resend.emails.send({
        from: "KAI Wellness Circle <concierge@kaiwellnessretreats.com>",
        to: [adminEmail],
        subject: `New Private Circle Subscriber: ${validation.data.email}`,
        html: `
          <div style="font-family: serif; padding: 24px; color: #2D3E35;">
            <h2>New Private Circle Member</h2>
            <p><strong>Email:</strong> ${validation.data.email}</p>
            <p>Added to the private priority list for future retreat cohort releases.</p>
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
