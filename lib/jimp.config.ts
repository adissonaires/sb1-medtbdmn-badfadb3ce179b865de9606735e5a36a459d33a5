import { MIME_JPEG } from 'jimp';

// Fix for Buffer <null> MIME type error
MIME_JPEG['<null>'] = 'image/jpeg';