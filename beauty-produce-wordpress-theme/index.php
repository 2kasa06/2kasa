<?php
/**
 * 汎用テンプレート。固定ページ・投稿・アーカイブのフォールバックとして使用します。
 *
 * @package BeautyProduce
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

get_header();
?>

<section class="bp-section bp-section--white bp-entry">
	<div class="bp-container bp-container--narrow">
		<?php if ( have_posts() ) : ?>

			<?php if ( is_singular() ) : ?>

				<?php
				while ( have_posts() ) :
					the_post();
					?>
					<article <?php post_class(); ?>>
						<header class="bp-heading" style="margin-bottom:2.5rem;">
							<p class="section-label"><?php echo esc_html( get_bloginfo( 'name' ) ); ?></p>
							<h1 class="section-title"><?php the_title(); ?></h1>
						</header>

						<?php if ( has_post_thumbnail() ) : ?>
							<div style="border-radius:1.5rem;overflow:hidden;margin-bottom:2.5rem;">
								<?php the_post_thumbnail( 'large' ); ?>
							</div>
						<?php endif; ?>

						<div class="bp-entry__content"><?php the_content(); ?></div>
					</article>
					<?php
				endwhile;
				?>

			<?php else : ?>

				<header class="bp-heading bp-heading--center" style="margin-bottom:3rem;">
					<p class="section-label"><?php echo esc_html( get_bloginfo( 'name' ) ); ?></p>
					<h1 class="section-title">
						<?php
						if ( is_search() ) {
							/* translators: %s: 検索語 */
							printf( esc_html__( '「%s」の検索結果', 'beauty-produce' ), esc_html( get_search_query() ) );
						} elseif ( is_archive() ) {
							the_archive_title();
						} else {
							esc_html_e( '記事一覧', 'beauty-produce' );
						}
						?>
					</h1>
				</header>

				<div class="bp-grid bp-grid--2">
					<?php
					while ( have_posts() ) :
						the_post();
						?>
						<article <?php post_class( 'card-glow bp-card' ); ?>>
							<h2 class="bp-card__title">
								<a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
							</h2>
							<div class="bp-card__text"><?php echo esc_html( get_the_excerpt() ); ?></div>
							<p><a class="nav-link" href="<?php the_permalink(); ?>">続きを読む →</a></p>
						</article>
						<?php
					endwhile;
					?>
				</div>

				<?php bp_pagination(); ?>

			<?php endif; ?>

		<?php else : ?>

			<div class="bp-heading bp-heading--center">
				<p class="section-label">NOT FOUND</p>
				<h1 class="section-title">ページが見つかりませんでした</h1>
				<p class="section-subtitle">アドレスが変更されたか、削除された可能性があります。トップページからお探しください。</p>
				<p style="margin-top:2rem;"><a class="btn-primary" href="<?php echo esc_url( home_url( '/' ) ); ?>">トップページへ</a></p>
			</div>

		<?php endif; ?>
	</div>
</section>

<?php
get_footer();
