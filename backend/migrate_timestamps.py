from sqlalchemy import text

from database import engine


TABLES = [
    "users",
    "sensor_readings",
    "alerts",
]


def get_created_at_type(connection, table_name):

    return connection.execute(
        text(
            """
            SELECT data_type
            FROM information_schema.columns
            WHERE table_name = :table_name
              AND column_name = 'created_at'
            """
        ),
        {
            "table_name": table_name
        }
    ).scalar()


with engine.begin() as connection:

    print("Checking timestamp columns...")
    print()

    for table_name in TABLES:

        current_type = get_created_at_type(
            connection,
            table_name
        )

        print(
            f"{table_name}.created_at: "
            f"{current_type}"
        )


        if (
            current_type
            ==
            "timestamp with time zone"
        ):

            print(
                "Already timezone-aware."
            )

            continue


        if (
            current_type
            ==
            "timestamp without time zone"
        ):

            print(
                "Migrating..."
            )

            connection.execute(
                text(
                    f"""
                    ALTER TABLE {table_name}
                    ALTER COLUMN created_at
                    TYPE TIMESTAMPTZ
                    USING created_at AT TIME ZONE 'UTC'
                    """
                )
            )

            print(
                "Done."
            )


print()
print("Final check:")
print()


with engine.connect() as connection:

    for table_name in TABLES:

        final_type = get_created_at_type(
            connection,
            table_name
        )

        print(
            f"{table_name}: "
            f"{final_type}"
        )