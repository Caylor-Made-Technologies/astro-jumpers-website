// Supabase Edge Function entry point: emails the owner and customer when bookings change.
// See handler.ts for the logic and the README for setup.
import { handle } from "./handler.ts";

Deno.serve(handle);
