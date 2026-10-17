"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Timestamp = exports.FieldValue = exports.db = void 0;
const admin = require("firebase-admin");
admin.initializeApp();
exports.db = admin.firestore();
exports.FieldValue = admin.firestore.FieldValue;
exports.Timestamp = admin.firestore.Timestamp;
//# sourceMappingURL=firebase.js.map