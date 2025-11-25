import admin from "firebase-admin";
import { getFirestore } from "../utils/firebaseAdmin.js";

const firestore = getFirestore();
const booksCollection = firestore.collection("books");
const { FieldValue } = admin.firestore;

const DEFAULT_LIMIT = 100;

const toTimestampString = (value) => {
  if (!value) return null;
  if (typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
};

const normalizeBookPayload = (book = {}) => {
  const title = book.title || book.title?.trim?.() || "";
  const counselorName =
    book.counselor_name || book.counselorName || book.counselor?.name || null;

  return {
    title,
    titleLower: title.toLowerCase(),
    author: book.author || null,
    counselorId: book.counselor_id || book.counselorId || null,
    counselorName,
    priceCents: book.price_cents ?? book.priceCents ?? 0,
    currency: book.currency || book.currency_code || "KES",
    description: book.description || "",
    format: book.format || "soft",
    coverImageUrl: book.cover_image_url || book.coverImageUrl || null,
    fileUrl: book.file_url || book.fileUrl || null,
    chapterCount: book.chapter_count ?? book.chapterCount ?? null,
    pageCount: book.page_count ?? book.pageCount ?? null,
    pickupStation: book.pickup_station ?? book.pickupStation ?? null,
    isActive: book.is_active ?? book.isActive ?? true,
    isSold: book.is_sold ?? book.isSold ?? false,
    downloadUrl: book.download_url ?? book.downloadUrl ?? null,
    previewUrl: book.preview_url ?? book.previewUrl ?? null,
    genre: book.genre || null,
  };
};

const mapDocToApi = (doc) => {
  if (!doc?.exists) return null;
  const data = doc.data();
  return {
    id: doc.id,
    title: data.title,
    author: data.author,
    price_cents: data.priceCents,
    currency: data.currency,
    description: data.description,
    format: data.format,
    cover_image_url: data.coverImageUrl,
    file_url: data.fileUrl,
    chapter_count: data.chapterCount,
    page_count: data.pageCount,
    pickup_station: data.pickupStation,
    is_active: data.isActive ?? true,
    is_sold: data.isSold ?? false,
    counselor_id: data.counselorId,
    counselor_name: data.counselorName || null,
    download_url: data.downloadUrl || null,
    preview_url: data.previewUrl || null,
    genre: data.genre || null,
    created_at: toTimestampString(data.createdAt),
    updated_at: toTimestampString(data.updatedAt),
  };
};

export async function upsertBookDocument(bookRow, overrides = {}) {
  if (!bookRow?.id) {
    throw new Error("Book ID is required to sync with Firestore");
  }

  const docRef = booksCollection.doc(String(bookRow.id));
  const existing = await docRef.get();
  const timestamps = existing.exists
    ? { updatedAt: FieldValue.serverTimestamp() }
    : {
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

  const payload = normalizeBookPayload({ ...bookRow, ...overrides });

  await docRef.set(
    {
      ...payload,
      ...timestamps,
    },
    { merge: true }
  );

  return mapDocToApi(await docRef.get());
}

export async function deleteBookDocument(bookId) {
  if (!bookId) return;
  await booksCollection.doc(String(bookId)).delete().catch((error) => {
    console.error("Failed to delete Firestore book doc:", error.message);
  });
}

export async function fetchBookById(bookId) {
  if (!bookId) return null;
  const doc = await booksCollection.doc(String(bookId)).get();
  return mapDocToApi(doc);
}

export async function fetchBooksForCounselor(counselorId) {
  if (!counselorId) return [];
  const snapshot = await booksCollection
    .where("counselorId", "==", counselorId)
    .get();
  return snapshot.docs.map((doc) => mapDocToApi(doc)).filter(Boolean);
}

const dateValue = (val) => {
  if (!val) return 0;
  return new Date(val).getTime();
};

export async function fetchStoreBooks({
  q,
  format,
  counselorId,
  limit = DEFAULT_LIMIT,
} = {}) {
  const snapshot = await booksCollection.get();
  let books = snapshot.docs.map((doc) => mapDocToApi(doc)).filter(Boolean);

  books = books.filter((book) => book.is_active !== false);

  if (format) {
    books = books.filter(
      (book) => (book.format || "").toLowerCase() === format.toLowerCase()
    );
  }

  if (counselorId) {
    books = books.filter((book) => book.counselor_id === counselorId);
  }

  if (q) {
    const qLower = q.toLowerCase();
    books = books.filter((book) => {
      const title = book.title?.toLowerCase() || "";
      const author = book.author?.toLowerCase() || "";
      return title.includes(qLower) || author.includes(qLower);
    });
  }

  books.sort((a, b) => {
    const aDate = dateValue(a.updated_at || a.created_at);
    const bDate = dateValue(b.updated_at || b.created_at);
    return bDate - aDate;
  });

  return books.slice(0, limit);
}

export async function fetchAllBooks(limit = 200) {
  const snapshot = await booksCollection.limit(limit).get();
  return snapshot.docs.map((doc) => mapDocToApi(doc)).filter(Boolean);
}


