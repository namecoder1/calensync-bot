import { createClient } from "./server";

export const getUsers = async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("users").select("*");

  if (error) {
    throw new Error(error.message);
  }

  return data;
}