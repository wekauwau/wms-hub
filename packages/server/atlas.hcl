env "local" {
  url = "postgres://wms:wms_dev@localhost:5432/wms?sslmode=disable"
  dev = "docker://postgres/18/dev?sslmode=disable"
  migration {
    dir = "file://migrations"
  }
  schema {
    src = "file://db/schema.sql"
  }
}
