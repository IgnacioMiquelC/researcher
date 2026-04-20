import { app } from './app.ts'
import {
    PORT,
    HOSTNAME
} from './config/server.ts'

app.listen(
    PORT,
    HOSTNAME,
    (error) => {
        // Errors should be handled by a dedicated module
        if (error) console.error(error);

        console.log(`Server running at http://${HOSTNAME}:${PORT}`);
    }
);
