import db


def create_notification(user_id: int, title: str, body: str, link: str | None = None) -> None:
    with db.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO notifications (user_id, title, body, link) VALUES (%s, %s, %s, %s)",
                (user_id, title, body, link),
            )
