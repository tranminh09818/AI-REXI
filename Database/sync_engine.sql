-- ============================================================
-- SYNC ENGINE 3-WAY: SQLite -> SQL Server + PostgreSQL
-- Version: 1.0
-- Tạo bảng hàng đợi + trigger tự động bắt thay đổi
-- ============================================================

-- Bảng hàng đợi đồng bộ
CREATE TABLE IF NOT EXISTS _sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,           -- INSERT / UPDATE / DELETE
    row_id TEXT,
    row_data TEXT,                    -- JSON snapshot dữ liệu row
    status TEXT DEFAULT 'pending',    -- pending / synced / error
    error TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON _sync_queue(status, created_at);

-- Bảng log đồng bộ (audit trail)
CREATE TABLE IF NOT EXISTS _sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    row_id TEXT,
    target_db TEXT NOT NULL,          -- sqlserver / postgresql
    status TEXT NOT NULL,             -- success / error
    error TEXT,
    synced_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- === NGUOI_DUNG ===
DROP TRIGGER IF EXISTS trg_nguoi_dung_ai;
CREATE TRIGGER trg_nguoi_dung_ai AFTER INSERT ON nguoi_dung FOR EACH ROW
BEGIN
    INSERT INTO _sync_queue (table_name, operation, row_id, row_data)
    VALUES ('nguoi_dung', 'INSERT', NEW.ma_nguoi_dung,
        json_object('ma_nguoi_dung', NEW.ma_nguoi_dung, 'email', NEW.email, 'ten_day_du', NEW.ten_day_du, 'phan_quyen', NEW.phan_quyen));
END;

DROP TRIGGER IF EXISTS trg_nguoi_dung_au;
CREATE TRIGGER trg_nguoi_dung_au AFTER UPDATE ON nguoi_dung FOR EACH ROW
BEGIN
    INSERT INTO _sync_queue (table_name, operation, row_id, row_data)
    VALUES ('nguoi_dung', 'UPDATE', NEW.ma_nguoi_dung,
        json_object('ma_nguoi_dung', NEW.ma_nguoi_dung, 'email', NEW.email, 'ten_day_du', NEW.ten_day_du, 'phan_quyen', NEW.phan_quyen));
END;

DROP TRIGGER IF EXISTS trg_nguoi_dung_ad;
CREATE TRIGGER trg_nguoi_dung_ad AFTER DELETE ON nguoi_dung FOR EACH ROW
BEGIN
    INSERT INTO _sync_queue (table_name, operation, row_id, row_data)
    VALUES ('nguoi_dung', 'DELETE', OLD.ma_nguoi_dung,
        json_object('ma_nguoi_dung', OLD.ma_nguoi_dung));
END;

-- === CUOC_HOI_THOAI ===
DROP TRIGGER IF EXISTS trg_cuoc_hoi_thoai_ai;
CREATE TRIGGER trg_cuoc_hoi_thoai_ai AFTER INSERT ON cuoc_hoi_thoai FOR EACH ROW
BEGIN
    INSERT INTO _sync_queue (table_name, operation, row_id, row_data)
    VALUES ('cuoc_hoi_thoai', 'INSERT', NEW.ma_hoi_thoai,
        json_object('ma_hoi_thoai', NEW.ma_hoi_thoai, 'ma_nguoi_dung', NEW.ma_nguoi_dung, 'tieu_de', NEW.tieu_de, 'ten_mo_hinh_ai', NEW.ten_mo_hinh_ai, 'trang_thai', NEW.trang_thai));
END;

DROP TRIGGER IF EXISTS trg_cuoc_hoi_thoai_au;
CREATE TRIGGER trg_cuoc_hoi_thoai_au AFTER UPDATE ON cuoc_hoi_thoai FOR EACH ROW
BEGIN
    INSERT INTO _sync_queue (table_name, operation, row_id, row_data)
    VALUES ('cuoc_hoi_thoai', 'UPDATE', NEW.ma_hoi_thoai,
        json_object('ma_hoi_thoai', NEW.ma_hoi_thoai, 'ma_nguoi_dung', NEW.ma_nguoi_dung, 'tieu_de', NEW.tieu_de, 'ten_mo_hinh_ai', NEW.ten_mo_hinh_ai, 'trang_thai', NEW.trang_thai));
END;

DROP TRIGGER IF EXISTS trg_cuoc_hoi_thoai_ad;
CREATE TRIGGER trg_cuoc_hoi_thoai_ad AFTER DELETE ON cuoc_hoi_thoai FOR EACH ROW
BEGIN
    INSERT INTO _sync_queue (table_name, operation, row_id, row_data)
    VALUES ('cuoc_hoi_thoai', 'DELETE', OLD.ma_hoi_thoai,
        json_object('ma_hoi_thoai', OLD.ma_hoi_thoai));
END;

-- === TIN_NHAN ===
DROP TRIGGER IF EXISTS trg_tin_nhan_ai;
CREATE TRIGGER trg_tin_nhan_ai AFTER INSERT ON tin_nhan FOR EACH ROW
BEGIN
    INSERT INTO _sync_queue (table_name, operation, row_id, row_data)
    VALUES ('tin_nhan', 'INSERT', NEW.ma_tin_nhan,
        json_object('ma_tin_nhan', NEW.ma_tin_nhan, 'ma_hoi_thoai', NEW.ma_hoi_thoai, 'vai_tro', NEW.vai_tro, 'noi_dung', substr(NEW.noi_dung, 1, 2000)));
END;

DROP TRIGGER IF EXISTS trg_tin_nhan_au;
CREATE TRIGGER trg_tin_nhan_au AFTER UPDATE ON tin_nhan FOR EACH ROW
BEGIN
    INSERT INTO _sync_queue (table_name, operation, row_id, row_data)
    VALUES ('tin_nhan', 'UPDATE', NEW.ma_tin_nhan,
        json_object('ma_tin_nhan', NEW.ma_tin_nhan, 'ma_hoi_thoai', NEW.ma_hoi_thoai, 'vai_tro', NEW.vai_tro, 'noi_dung', substr(NEW.noi_dung, 1, 2000)));
END;

DROP TRIGGER IF EXISTS trg_tin_nhan_ad;
CREATE TRIGGER trg_tin_nhan_ad AFTER DELETE ON tin_nhan FOR EACH ROW
BEGIN
    INSERT INTO _sync_queue (table_name, operation, row_id, row_data)
    VALUES ('tin_nhan', 'DELETE', OLD.ma_tin_nhan,
        json_object('ma_tin_nhan', OLD.ma_tin_nhan));
END;

-- === KHOA_API ===
DROP TRIGGER IF EXISTS trg_khoa_api_ai;
CREATE TRIGGER trg_khoa_api_ai AFTER INSERT ON khoa_api FOR EACH ROW
BEGIN
    INSERT INTO _sync_queue (table_name, operation, row_id, row_data)
    VALUES ('khoa_api', 'INSERT', NEW.ma_khoa,
        json_object('ma_khoa', NEW.ma_khoa, 'ma_nguoi_dung', NEW.ma_nguoi_dung, 'ten_nha_cung_cap', NEW.ten_nha_cung_cap, 'gia_tri_khoa', NEW.gia_tri_khoa));
END;

DROP TRIGGER IF EXISTS trg_khoa_api_au;
CREATE TRIGGER trg_khoa_api_au AFTER UPDATE ON khoa_api FOR EACH ROW
BEGIN
    INSERT INTO _sync_queue (table_name, operation, row_id, row_data)
    VALUES ('khoa_api', 'UPDATE', NEW.ma_khoa,
        json_object('ma_khoa', NEW.ma_khoa, 'ma_nguoi_dung', NEW.ma_nguoi_dung, 'ten_nha_cung_cap', NEW.ten_nha_cung_cap, 'gia_tri_khoa', NEW.gia_tri_khoa));
END;

DROP TRIGGER IF EXISTS trg_khoa_api_ad;
CREATE TRIGGER trg_khoa_api_ad AFTER DELETE ON khoa_api FOR EACH ROW
BEGIN
    INSERT INTO _sync_queue (table_name, operation, row_id, row_data)
    VALUES ('khoa_api', 'DELETE', OLD.ma_khoa,
        json_object('ma_khoa', OLD.ma_khoa));
END;

-- === KY_NANG (skills) ===
DROP TRIGGER IF EXISTS trg_ky_nang_ai;
CREATE TRIGGER trg_ky_nang_ai AFTER INSERT ON ky_nang FOR EACH ROW
BEGIN
    INSERT INTO _sync_queue (table_name, operation, row_id, row_data)
    VALUES ('ky_nang', 'INSERT', NEW.ma_ky_nang,
        json_object('ma_ky_nang', NEW.ma_ky_nang, 'ten_ky_nang', NEW.ten_ky_nang, 'tieu_de', NEW.tieu_de, 'mo_ta', NEW.mo_ta, 'trang_thai', NEW.trang_thai));
END;

DROP TRIGGER IF EXISTS trg_ky_nang_au;
CREATE TRIGGER trg_ky_nang_au AFTER UPDATE ON ky_nang FOR EACH ROW
BEGIN
    INSERT INTO _sync_queue (table_name, operation, row_id, row_data)
    VALUES ('ky_nang', 'UPDATE', NEW.ma_ky_nang,
        json_object('ma_ky_nang', NEW.ma_ky_nang, 'ten_ky_nang', NEW.ten_ky_nang, 'tieu_de', NEW.tieu_de, 'mo_ta', NEW.mo_ta, 'trang_thai', NEW.trang_thai));
END;

DROP TRIGGER IF EXISTS trg_ky_nang_ad;
CREATE TRIGGER trg_ky_nang_ad AFTER DELETE ON ky_nang FOR EACH ROW
BEGIN
    INSERT INTO _sync_queue (table_name, operation, row_id, row_data)
    VALUES ('ky_nang', 'DELETE', OLD.ma_ky_nang,
        json_object('ma_ky_nang', OLD.ma_ky_nang));
END;

-- === BO_NHO_DAI_HAN ===
DROP TRIGGER IF EXISTS trg_bo_nho_dai_han_ai;
CREATE TRIGGER trg_bo_nho_dai_han_ai AFTER INSERT ON bo_nho_dai_han FOR EACH ROW
BEGIN
    INSERT INTO _sync_queue (table_name, operation, row_id, row_data)
    VALUES ('bo_nho_dai_han', 'INSERT', NEW.ma_bo_nho,
        json_object('ma_bo_nho', NEW.ma_bo_nho, 'ma_nguoi_dung', NEW.ma_nguoi_dung, 'loai', NEW.loai, 'noi_dung', NEW.noi_dung, 'do_uu_tien', NEW.do_uu_tien));
END;

DROP TRIGGER IF EXISTS trg_bo_nho_dai_han_au;
CREATE TRIGGER trg_bo_nho_dai_han_au AFTER UPDATE ON bo_nho_dai_han FOR EACH ROW
BEGIN
    INSERT INTO _sync_queue (table_name, operation, row_id, row_data)
    VALUES ('bo_nho_dai_han', 'UPDATE', NEW.ma_bo_nho,
        json_object('ma_bo_nho', NEW.ma_bo_nho, 'ma_nguoi_dung', NEW.ma_nguoi_dung, 'loai', NEW.loai, 'noi_dung', NEW.noi_dung, 'do_uu_tien', NEW.do_uu_tien));
END;

DROP TRIGGER IF EXISTS trg_bo_nho_dai_han_ad;
CREATE TRIGGER trg_bo_nho_dai_han_ad AFTER DELETE ON bo_nho_dai_han FOR EACH ROW
BEGIN
    INSERT INTO _sync_queue (table_name, operation, row_id, row_data)
    VALUES ('bo_nho_dai_han', 'DELETE', OLD.ma_bo_nho,
        json_object('ma_bo_nho', OLD.ma_bo_nho));
END;

-- === AI_PROVIDERS ===
DROP TRIGGER IF EXISTS trg_ai_providers_ai;
CREATE TRIGGER trg_ai_providers_ai AFTER INSERT ON ai_providers FOR EACH ROW
BEGIN
    INSERT INTO _sync_queue (table_name, operation, row_id, row_data)
    VALUES ('ai_providers', 'INSERT', NEW.ma_nha_cung_cap,
        json_object('ma_nha_cung_cap', NEW.ma_nha_cung_cap, 'ten_hien_thi', NEW.ten_hien_thi, 'base_url', NEW.base_url, 'can_api_key', NEW.can_api_key, 'placeholder', NEW.placeholder, 'thu_tu', NEW.thu_tu, 'kich_hoat', NEW.kich_hoat));
END;

DROP TRIGGER IF EXISTS trg_ai_providers_au;
CREATE TRIGGER trg_ai_providers_au AFTER UPDATE ON ai_providers FOR EACH ROW
BEGIN
    INSERT INTO _sync_queue (table_name, operation, row_id, row_data)
    VALUES ('ai_providers', 'UPDATE', NEW.ma_nha_cung_cap,
        json_object('ma_nha_cung_cap', NEW.ma_nha_cung_cap, 'ten_hien_thi', NEW.ten_hien_thi, 'base_url', NEW.base_url, 'can_api_key', NEW.can_api_key, 'placeholder', NEW.placeholder, 'thu_tu', NEW.thu_tu, 'kich_hoat', NEW.kich_hoat));
END;

DROP TRIGGER IF EXISTS trg_ai_providers_ad;
CREATE TRIGGER trg_ai_providers_ad AFTER DELETE ON ai_providers FOR EACH ROW
BEGIN
    INSERT INTO _sync_queue (table_name, operation, row_id, row_data)
    VALUES ('ai_providers', 'DELETE', OLD.ma_nha_cung_cap,
        json_object('ma_nha_cung_cap', OLD.ma_nha_cung_cap));
END;

-- === AI_MODELS ===
DROP TRIGGER IF EXISTS trg_ai_models_ai;
CREATE TRIGGER trg_ai_models_ai AFTER INSERT ON ai_models FOR EACH ROW
BEGIN
    INSERT INTO _sync_queue (table_name, operation, row_id, row_data)
    VALUES ('ai_models', 'INSERT', NEW.ma_model,
        json_object('ma_model', NEW.ma_model, 'ma_nha_cung_cap', NEW.ma_nha_cung_cap, 'ten_hien_thi', NEW.ten_hien_thi, 'loai', NEW.loai, 'thu_tu_hien_thi', NEW.thu_tu_hien_thi, 'kich_hoat', NEW.kich_hoat));
END;

DROP TRIGGER IF EXISTS trg_ai_models_au;
CREATE TRIGGER trg_ai_models_au AFTER UPDATE ON ai_models FOR EACH ROW
BEGIN
    INSERT INTO _sync_queue (table_name, operation, row_id, row_data)
    VALUES ('ai_models', 'UPDATE', NEW.ma_model,
        json_object('ma_model', NEW.ma_model, 'ma_nha_cung_cap', NEW.ma_nha_cung_cap, 'ten_hien_thi', NEW.ten_hien_thi, 'loai', NEW.loai, 'thu_tu_hien_thi', NEW.thu_tu_hien_thi, 'kich_hoat', NEW.kich_hoat));
END;

DROP TRIGGER IF EXISTS trg_ai_models_ad;
CREATE TRIGGER trg_ai_models_ad AFTER DELETE ON ai_models FOR EACH ROW
BEGIN
    INSERT INTO _sync_queue (table_name, operation, row_id, row_data)
    VALUES ('ai_models', 'DELETE', OLD.ma_model,
        json_object('ma_model', OLD.ma_model));
END;

-- ============================================================
-- NOTE: Để thêm bảng mới vào sync, copy pattern trigger trên
-- và đổi table_name + column mapping.
-- ============================================================
