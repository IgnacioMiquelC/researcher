let port = process.env.PORT;
if (Number.isNaN(port)) {
    throw new Error("PORT is not a number.")
};
export const PORT = Number(port);

export const HOSTNAME = String(process.env.HOSTNAME || "0.0.0.0");
