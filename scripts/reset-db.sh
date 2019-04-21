echo "Removing existing image from local environment..."
docker image rm sgoldber61/bn-postgres --force
echo "Rebuilding image with updated dev database..."
docker build -t sgoldber61/bn-postgres -f Dockerfile-postgres .
echo ""

# To push to Docker hub, run:
# docker push sgoldber61/inv-postgres

